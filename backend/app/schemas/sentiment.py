from pydantic import BaseModel


class SentimentPoint(BaseModel):
    date: str
    score: float


class SentimentCard(BaseModel):
    label: str
    value: float | None = None
    rating: str
    source: str
    history: list[SentimentPoint] = []
    error: str | None = None


class SentimentOverviewResponse(BaseModel):
    cards: list[SentimentCard]


class FngComparison(BaseModel):
    label: str
    date: str
    score: float
    rating: str


class FngDetailResponse(BaseModel):
    value: float | None = None
    rating: str
    source: str
    last_updated: str | None = None
    comparisons: list[FngComparison] = []
    history: list[SentimentPoint] = []
    error: str | None = None
