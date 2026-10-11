"""Per-tool context builders: tool props (dict) → compact text for the LLM.

Each builder takes the `props` dict a tool returned and renders only the
fields that matter for a written take, capped so a local model isn't
flooded. `CONTEXT_BUILDERS` maps tool/component name → builder; tools not
listed here (e.g. greet_user) get no synthesized take.
"""
from app.AlAgent.prompts import ANNUAL_ROW_TEMPLATE, STOCK_FUNDAMENTALS_TEMPLATE


def _fmt(v, suffix: str = "", digits: int = 2) -> str:
    if v is None:
        return "n/a"
    if isinstance(v, (int, float)):
        a = abs(v)
        if a >= 1e12:
            return f"{v / 1e12:.2f}T{suffix}"
        if a >= 1e9:
            return f"{v / 1e9:.1f}B{suffix}"
        if a >= 1e6:
            return f"{v / 1e6:.0f}M{suffix}"
        return f"{v:.{digits}f}{suffix}"
    return f"{v}{suffix}"


def _ratio_pct(v) -> str:
    return _fmt(v * 100, "%", 1) if isinstance(v, (int, float)) else "n/a"


def _pct(v) -> str:
    """Signed percent for daily changes: +1.23% / -0.45%."""
    return f"{v:+.2f}%" if isinstance(v, (int, float)) else "n/a"


def _quote_line(q: dict, price_prefix: str = "") -> str:
    return f"{q.get('name') or q.get('symbol')} {price_prefix}{_fmt(q.get('price'))} ({_pct(q.get('change_percent'))})"


def _sorted_by_change(rows: list[dict], reverse: bool) -> list[dict]:
    return sorted(
        (r for r in rows if isinstance(r.get("change_percent"), (int, float))),
        key=lambda r: r["change_percent"],
        reverse=reverse,
    )


def market_overview_context(p: dict) -> str:
    usa = p.get("usa") or []
    india = p.get("india") or []
    sectors = p.get("usa_sectors") or []
    sentiment = p.get("sentiment") or []
    leaders = _sorted_by_change(sectors, reverse=True)
    up = sum(1 for s in leaders if s["change_percent"] > 0)
    lines = [
        "US indices: " + "; ".join(_quote_line(q) for q in usa),
        "India indices: " + "; ".join(_quote_line(q) for q in india),
        f"Sector breadth: {up} of {len(leaders)} sectors up",
        "Leading sectors: " + "; ".join(_quote_line(q) for q in leaders[:3]),
        "Lagging sectors: " + "; ".join(_quote_line(q) for q in leaders[-3:][::-1]),
        "Sentiment: " + "; ".join(
            f"{c.get('label')} {_fmt(c.get('value'), digits=1)} ({c.get('rating')})"
            for c in sentiment if not c.get("error")
        ),
    ]
    return "\n".join(lines)


def trending_context(p: dict) -> str:
    def rows(key: str, n: int = 5) -> str:
        return "; ".join(
            f"{r.get('symbol')} {_pct(r.get('change_percent'))} @ {_fmt(r.get('price'))}"
            + (f" vol {_fmt(r.get('volume'), digits=0)}" if key == "most_active" else "")
            for r in (p.get(key) or [])[:n]
        ) or "n/a"
    return "\n".join([
        f"Top gainers: {rows('gainers')}",
        f"Top losers: {rows('losers')}",
        f"Most active: {rows('most_active')}",
    ])


def crypto_context(p: dict) -> str:
    quotes = p.get("quotes") or []
    fg = p.get("fear_greed") or {}
    up = sum(1 for q in quotes if isinstance(q.get("change_percent"), (int, float)) and q["change_percent"] > 0)
    return "\n".join([
        "Prices: " + "; ".join(_quote_line(q, "$") for q in quotes[:8]),
        f"Breadth: {up} of {len(quotes)} coins up",
        f"Crypto Fear & Greed: {_fmt(fg.get('value'), digits=0)} ({fg.get('rating', 'n/a')})",
    ])


def bond_context(p: dict) -> str:
    def y(b: dict) -> str:
        chg = b.get("change_bps")
        chg_s = f"{chg:+.0f}bps" if isinstance(chg, (int, float)) else "n/a"
        mo = b.get("month_ago_yield_pct")
        mo_s = f", month ago {_fmt(mo, '%')}" if mo is not None else ""
        return f"{b.get('name')} {_fmt(b.get('yield_pct'), '%')} ({chg_s} today{mo_s})"
    spread = p.get("spread_13w_10y_bps")
    return "\n".join([
        "Yields: " + "; ".join(y(b) for b in (p.get("yields") or p.get("curve") or [])),
        f"Curve shape: {p.get('curve_shape', 'Unknown')}; 3M-10Y spread "
        f"{f'{spread:+.0f}' if isinstance(spread, (int, float)) else 'n/a'} bps",
        "Bond ETFs: " + "; ".join(_quote_line(e) for e in p.get("etfs") or []),
        f"Service summary: {p.get('summary') or 'n/a'}",
    ])


def cpi_context(p: dict) -> str:
    hist = p.get("history") or []
    prior = hist[-2]["value"] if len(hist) >= 2 else None
    return "\n".join([
        f"Report date: {p.get('date') or 'n/a'}",
        f"Headline CPI: {_fmt(p.get('headline_yoy'), '%', 1)} YoY, {_fmt(p.get('headline_mom'), '%', 1)} MoM",
        f"Core CPI: {_fmt(p.get('core_yoy'), '%', 1)} YoY",
        f"Trend: {p.get('trend', 'Neutral')}; prior month index {_fmt(prior, digits=1)}, latest {_fmt(p.get('value'), digits=1)}",
    ])


def events_context(p: dict) -> str:
    events = p.get("events") or []
    rank = {"high": 0, "medium": 1, "low": 2}
    ordered = sorted(events, key=lambda e: rank.get(str(e.get("impact", "")).lower(), 3))[:8]
    if not ordered:
        return "No upcoming events found."
    return "\n".join(
        f"- {e.get('date')}: {e.get('title')} [{e.get('impact')}] "
        f"forecast {e.get('forecast') or 'n/a'}, prior {e.get('previous') or 'n/a'}"
        for e in ordered
    )


def smart_money_context(p: dict) -> str:
    c = p.get("congress") or {}
    signals = "; ".join(
        f"{s.get('issuer')} ({s.get('action')} by {s.get('fund_count')} funds, {_fmt(s.get('combined_value_change'))})"
        for s in (p.get("signals") or [])[:6]
    ) or "none"
    funds = "; ".join(
        f"{f.get('fund')} {f.get('stance')} (new {f.get('new_buys', 0)}, add {f.get('adds', 0)}, "
        f"trim {f.get('trims', 0)}, exit {f.get('exits', 0)})"
        for f in (p.get("fund_activity") or [])
    ) or "n/a"
    return "\n".join([
        f"Institutional stance: {p.get('institution_stance', 'mixed')}",
        f"Service summary: {p.get('summary') or 'n/a'}",
        "Key points: " + " | ".join(p.get("key_points") or []) or "Key points: n/a",
        f"High-conviction signals: {signals}",
        f"Fund activity: {funds}",
        f"Congress: {c.get('buys', 0)} buys / {c.get('sells', 0)} sells, net ${_fmt(c.get('net_millions'), digits=1)}M; "
        f"top buy {c.get('top_buy') or 'n/a'}, top sell {c.get('top_sell') or 'n/a'}",
    ])


def stock_analysis_context(p: dict) -> str:
    t = p.get("analyst_targets") or {}
    r = p.get("recommendations") or {}
    fin = (p.get("financials") or {}).get("annual") or []
    annual = "; ".join(
        ANNUAL_ROW_TEMPLATE.format(
            year=(row.get("period") or "?")[:4],
            revenue=_fmt(row.get("revenue")),
            net_income=_fmt(row.get("net_income")),
            free_cashflow=_fmt(row.get("free_cashflow")),
            eps=_fmt(row.get("eps")),
        )
        for row in fin[:5]
    ) or "n/a"

    return STOCK_FUNDAMENTALS_TEMPLATE.format(
        name=p.get("name"),
        symbol=p.get("symbol"),
        sector=p.get("sector") or "n/a",
        industry=p.get("industry") or "n/a",
        country=p.get("country") or "n/a",
        description=(p.get("description") or "")[:600] or "n/a",
        price=_fmt(p.get("price")),
        change_percent=_fmt(p.get("change_percent"), "%"),
        low_52w=_fmt(p.get("fifty_two_week_low")),
        high_52w=_fmt(p.get("fifty_two_week_high")),
        position_52w=_fmt(p.get("fifty_two_week_position_pct"), "%", 0),
        avg_50d=_fmt(p.get("fifty_day_avg")),
        avg_200d=_fmt(p.get("two_hundred_day_avg")),
        beta=_fmt(p.get("beta")),
        market_cap=_fmt(p.get("market_cap")),
        enterprise_value=_fmt(p.get("enterprise_value")),
        trailing_pe=_fmt(p.get("trailing_pe")),
        forward_pe=_fmt(p.get("forward_pe")),
        peg_ratio=_fmt(p.get("peg_ratio")),
        price_to_book=_fmt(p.get("price_to_book")),
        price_to_sales=_fmt(p.get("price_to_sales")),
        dividend_yield=_fmt(p.get("dividend_yield"), "%"),
        revenue_growth=_ratio_pct(p.get("revenue_growth")),
        earnings_growth=_ratio_pct(p.get("earnings_growth")),
        earnings_quarterly_growth=_ratio_pct(p.get("earnings_quarterly_growth")),
        gross_margin=_ratio_pct(p.get("gross_margin")),
        operating_margin=_ratio_pct(p.get("operating_margin")),
        profit_margin=_ratio_pct(p.get("profit_margin")),
        return_on_equity=_ratio_pct(p.get("return_on_equity")),
        return_on_assets=_ratio_pct(p.get("return_on_assets")),
        total_cash=_fmt(p.get("total_cash")),
        total_debt=_fmt(p.get("total_debt")),
        debt_to_equity=_fmt(p.get("debt_to_equity")),
        current_ratio=_fmt(p.get("current_ratio")),
        free_cashflow=_fmt(p.get("free_cashflow")),
        operating_cashflow=_fmt(p.get("operating_cashflow")),
        short_percent_of_float=_ratio_pct(p.get("short_percent_of_float")),
        num_analysts=r.get("num_analysts", 0),
        consensus=r.get("consensus", "n/a"),
        strong_buy=r.get("strong_buy", 0),
        buy=r.get("buy", 0),
        hold=r.get("hold", 0),
        sell=r.get("sell", 0),
        strong_sell=r.get("strong_sell", 0),
        target_low=_fmt(t.get("low")),
        target_mean=_fmt(t.get("mean")),
        target_high=_fmt(t.get("high")),
        target_upside=_fmt(t.get("upside_pct"), "%", 1),
        annual_financials=annual,
    )


CONTEXT_BUILDERS = {
    "stock_market_overview": market_overview_context,
    "trending_stocks": trending_context,
    "crypto_market_overview": crypto_context,
    "bond_market_overview": bond_context,
    "cpi_report": cpi_context,
    "upcoming_economic_events": events_context,
    "smart_money": smart_money_context,
    "stock_analysis_by_symbol": stock_analysis_context,
}
