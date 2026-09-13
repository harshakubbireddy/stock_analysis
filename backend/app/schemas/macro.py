"""Schemas for macro/bond-market chat components."""
from pydantic import BaseModel


class BondYield(BaseModel):
    symbol: str
    name: str
    maturity_years: float | None = None
    yield_pct: float | None = None
    change_bps: float | None = None
    month_ago_yield_pct: float | None = None


class BondEtf(BaseModel):
    symbol: str
    name: str
    price: float | None = None
    change_percent: float | None = None


class CpiPoint(BaseModel):
    date: str
    value: float


class CpiReportResponse(BaseModel):
    date: str | None = None
    headline_yoy: float | None = None
    headline_mom: float | None = None
    core_yoy: float | None = None
    value: float | None = None
    history: list[CpiPoint] = []
    trend: str = "Neutral"
    error: str | None = None


class EconomicEvent(BaseModel):
    title: str
    date: str
    impact: str
    forecast: str | None = None
    previous: str | None = None


class BondMarketOverviewResponse(BaseModel):
    summary: str = ""
    yields: list[BondYield] = []
    curve: list[BondYield] = []
    spread_13w_10y_bps: float | None = None
    curve_shape: str = "Unknown"
    etfs: list[BondEtf] = []
    cpi_report: CpiReportResponse = CpiReportResponse()
    upcoming_events: list[EconomicEvent] = []
