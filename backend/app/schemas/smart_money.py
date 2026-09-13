"""Schemas for the smart-money analysis chat component
(aggregates 13F fund filings + congressional trades)."""
from pydantic import BaseModel


class BatchAction(BaseModel):
    action: str  # new_buy | add | trim | exit
    issuer: str
    value_change: int
    pct_of_portfolio: float


class FundActivity(BaseModel):
    fund: str
    period: str | None = None
    new_buys: int = 0
    adds: int = 0
    trims: int = 0
    exits: int = 0
    flow_score: float = 0
    stance: str = "Neutral"
    top_moves: list[BatchAction] = []


class CongressSummary(BaseModel):
    buys: int = 0
    sells: int = 0
    approx_buy_millions: float = 0
    approx_sell_millions: float = 0
    net_millions: float = 0
    top_buy: str | None = None
    top_sell: str | None = None
    recent: list[dict] = []


class ConvictionSignal(BaseModel):
    issuer: str
    action: str  # new_buy | add | trim | exit
    fund_count: int
    combined_value_change: int


class SmartMoneyAnalysisResponse(BaseModel):
    summary: str = ""
    institution_stance: str = "mixed"
    key_points: list[str] = []
    signals: list[ConvictionSignal] = []
    fund_activity: list[FundActivity] = []
    congress: CongressSummary = CongressSummary()
    sources: dict[str, int] = {"funds": 0, "congress_traders": 0}
