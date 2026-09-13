"""Bond market, CPI, and economic-event data for the AI chat tools.

Sources (all free, no API keys):
- Treasury yields + bond ETFs: yfinance (yields are quoted x10 on Yahoo)
- CPI: FRED fredgraph CSV endpoints (CPIAUCSL headline, CPILFESL core)
- Upcoming events: FairEconomy's public economic-calendar JSON
"""
from datetime import datetime, timezone

import httpx
import pandas as pd
import yfinance as yf

from app.core.cache import cached_model, get_raw, set_raw, store_model
from app.schemas.macro import (
    BondEtf,
    BondMarketOverviewResponse,
    BondYield,
    CpiPoint,
    CpiReportResponse,
    EconomicEvent,
)

BOND_CACHE_TTL = 300
CPI_CACHE_TTL = 6 * 3600
EVENTS_CACHE_TTL = 3600

TREASURY_YIELDS = [
    ("^IRX", "13-Week T-Bill", 0.25),
    ("^FVX", "5-Year Treasury", 5.0),
    ("^TNX", "10-Year Treasury", 10.0),
    ("^TYX", "30-Year Treasury", 30.0),
]

BOND_ETFS = [
    ("SHY", "1-3Y Treasury"),
    ("IEF", "7-10Y Treasury"),
    ("TLT", "20+Y Treasury"),
    ("TIP", "TIPS"),
    ("LQD", "Inv Grade Corp"),
    ("HYG", "High Yield Corp"),
]

FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"
CPI_SERIES = {"headline": "CPIAUCSL", "core": "CPILFESL"}
EVENTS_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"


# ---------------------------------------------------------------- bond market
def _fetch_bond_yields() -> list[BondYield]:
    yields: list[BondYield] = []
    for symbol, name, maturity in TREASURY_YIELDS:
        bond = BondYield(symbol=symbol, name=name, maturity_years=maturity)
        try:
            data = yf.download(
                symbol, period="2mo", interval="1d",
                group_by="ticker", progress=False, auto_adjust=False,
            )
            multi = isinstance(data.columns, pd.MultiIndex)
            closes = (data[symbol]["Close"] if multi else data["Close"]).dropna()
            if len(closes) >= 2:
                # Yahoo quotes yield indices either as yield*10 (41.7) or as
                # plain yield (4.17) depending on yfinance version — normalize.
                scale = 10 if float(closes.iloc[-1]) > 20 else 1
                latest = float(closes.iloc[-1]) / scale
                prev = float(closes.iloc[-2]) / scale
                month_ago = float(closes.iloc[max(0, len(closes) - 22)]) / scale
                bond.yield_pct = round(latest, 2)
                bond.change_bps = round((latest - prev) * 100, 1)
                bond.month_ago_yield_pct = round(month_ago, 2)
        except Exception:
            pass
        yields.append(bond)
    return yields


def _fetch_bond_etfs() -> list[BondEtf]:
    etfs: list[BondEtf] = []
    for symbol, name in BOND_ETFS:
        etf = BondEtf(symbol=symbol, name=name)
        try:
            data = yf.download(
                symbol, period="5d", interval="1d",
                group_by="ticker", progress=False, auto_adjust=False,
            )
            multi = isinstance(data.columns, pd.MultiIndex)
            closes = (data[symbol]["Close"] if multi else data["Close"]).dropna()
            if len(closes) >= 2:
                last = float(closes.iloc[-1])
                prev = float(closes.iloc[-2])
                etf.price = round(last, 2)
                etf.change_percent = round((last - prev) / prev * 100, 2)
        except Exception:
            pass
        etfs.append(etf)
    return etfs


def _classify_curve(curve: list[BondYield]) -> str:
    first = curve[0].yield_pct
    last = curve[-1].yield_pct
    if first is None or last is None:
        return "Unavailable"
    diff_bps = (last - first) * 100
    if diff_bps < -25:
        return "Inverted"
    if diff_bps <= 25:
        return "Flat"
    return "Normal (upward sloping)"


# ------------------------------------------------------------------ CPI report
def _fetch_cpi_series(series: str) -> list[CpiPoint]:
    response = httpx.get(FRED_CSV_URL.format(series=series), timeout=15.0)
    response.raise_for_status()
    points: list[CpiPoint] = []
    lines = response.text.strip().splitlines()[1:]  # skip header
    for line in lines[-20:]:
        date_str, _, value = line.partition(",")
        try:
            points.append(CpiPoint(date=date_str, value=float(value)))
        except ValueError:
            continue
    return points


def _classify_cpi(yoy: float | None, prev_yoy: float | None) -> str:
    if yoy is None:
        return "Unavailable"
    if prev_yoy is not None:
        if yoy < prev_yoy - 0.1:
            return "Cooling"
        if yoy > prev_yoy + 0.1:
            return "Re-accelerating"
    return "Neutral"


def get_cpi_report() -> CpiReportResponse:
    key = "macro:cpi_report"
    hit = cached_model(key, CpiReportResponse, ttl=CPI_CACHE_TTL)
    if hit is not None:
        return hit

    try:
        headline = _fetch_cpi_series(CPI_SERIES["headline"])
        core = _fetch_cpi_series(CPI_SERIES["core"])
        if len(headline) < 14 or len(core) < 13:
            return CpiReportResponse(error="Not enough CPI history returned")

        def pct_change(points: list[CpiPoint], months: int) -> float:
            return round((points[-1].value / points[-1 - months].value - 1) * 100, 2)

        result = CpiReportResponse(
            date=headline[-1].date,
            value=headline[-1].value,
            headline_yoy=pct_change(headline, 12),
            headline_mom=pct_change(headline, 1),
            core_yoy=pct_change(core, 12),
            history=headline[-12:],
            trend=_classify_cpi(
                pct_change(headline, 12), pct_change(headline[:-1], 12)
            ),
        )
        store_model(key, result)
        return result
    except Exception as exc:
        return CpiReportResponse(error=str(exc))


# -------------------------------------------------------------- economic events
def get_upcoming_economic_events(limit: int = 10) -> list[EconomicEvent]:
    key = "macro:econ_events"
    hit = get_raw(key, ttl=EVENTS_CACHE_TTL)
    if hit is not None:
        return [EconomicEvent(**item) for item in hit]

    def parse_events(raw: list[dict]) -> list[EconomicEvent]:
        dated: list[tuple[datetime, dict]] = []
        for item in raw:
            if item.get("country") != "USD":
                continue
            if item.get("impact") not in ("High", "Medium"):
                continue
            try:
                when = datetime.fromisoformat(str(item["date"]))
            except (KeyError, ValueError):
                continue
            dated.append((when, item))
        dated.sort(key=lambda pair: pair[0])
        return [
            EconomicEvent(
                title=str(item.get("title", "")),
                date=when.strftime("%a %b %d, %H:%M ET"),
                impact=str(item.get("impact")),
                forecast=str(item["forecast"]) if item.get("forecast") else None,
                previous=str(item["previous"]) if item.get("previous") else None,
            )
            for when, item in dated[:limit]
        ]

    try:
        response = httpx.get(EVENTS_URL, timeout=15.0)
        response.raise_for_status()
        events = parse_events(response.json())
        set_raw(key, [e.model_dump() for e in events])
        return events
    except Exception:
        return []


# ------------------------------------------------------------- bond overview
def get_bond_market_overview() -> BondMarketOverviewResponse:
    key = "macro:bond_overview"
    hit = cached_model(key, BondMarketOverviewResponse, ttl=BOND_CACHE_TTL)
    if hit is not None:
        return hit

    yields = _fetch_bond_yields()
    curve = [b for b in yields if b.maturity_years is not None and b.yield_pct is not None]
    spread = None
    if yields[0].yield_pct is not None and len(yields) > 2 and yields[2].yield_pct is not None:
        spread = round((yields[2].yield_pct - yields[0].yield_pct) * 100, 1)
    shape = _classify_curve(curve)

    ten_year = yields[2].yield_pct
    summary = (
        f"10Y Treasury at {ten_year:.2f}%, curve {shape.lower()}"
        if ten_year is not None
        else "Treasury yield data temporarily unavailable"
    )

    result = BondMarketOverviewResponse(
        summary=summary,
        yields=yields,
        curve=curve,
        spread_13w_10y_bps=spread,
        curve_shape=shape,
        etfs=_fetch_bond_etfs(),
        cpi_report=get_cpi_report(),
        upcoming_events=get_upcoming_economic_events(),
    )
    store_model(key, result)
    return result
