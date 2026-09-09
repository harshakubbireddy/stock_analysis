from pydantic import BaseModel


class MarketQuote(BaseModel):
    symbol: str
    name: str
    price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    sparkline: list[float] = []


class MarketOverviewResponse(BaseModel):
    usa: list[MarketQuote]
    india: list[MarketQuote]
    crypto: list[MarketQuote]
    usa_sectors: list[MarketQuote]
