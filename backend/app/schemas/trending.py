from pydantic import BaseModel


class TrendingStock(BaseModel):
    symbol: str
    name: str
    price: float | None = None
    change_percent: float | None = None
    volume: int | None = None


class TrendingResponse(BaseModel):
    most_active: list[TrendingStock]
    gainers: list[TrendingStock]
    losers: list[TrendingStock]
