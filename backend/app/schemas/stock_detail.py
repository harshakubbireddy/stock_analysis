from pydantic import BaseModel


class ChartPoint(BaseModel):
    time: str
    price: float


class StockDetail(BaseModel):
    symbol: str
    name: str
    price: float | None = None
    change: float | None = None
    change_percent: float | None = None
    previous_close: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    market_cap: int | None = None
    trailing_pe: float | None = None
    volume: int | None = None
    intraday: list[ChartPoint] = []


class NewsItem(BaseModel):
    title: str
    summary: str | None = None
    publisher: str | None = None
    url: str | None = None
    published: str | None = None
    symbol: str


class NewsFeedResponse(BaseModel):
    items: list[NewsItem]
