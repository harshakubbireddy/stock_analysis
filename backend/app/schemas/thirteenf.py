from pydantic import BaseModel


class Fund(BaseModel):
    name: str
    cik: str


class Holding(BaseModel):
    rank: int
    issuer: str
    cusip: str
    value_usd: int
    shares: int
    pct_of_portfolio: float


class HoldingsResponse(BaseModel):
    fund_name: str
    cik: str
    accession_number: str
    filing_date: str | None = None
    period_of_report: str | None = None
    total_value_usd: int
    holdings: list[Holding]


class Transaction(BaseModel):
    issuer: str
    cusip: str
    action: str  # "new_buy", "add", "trim", "exit"
    shares_prev: int
    shares_latest: int
    shares_change: int
    value_prev: int
    value_latest: int
    value_change: int
    pct_of_portfolio: float


class TransactionsResponse(BaseModel):
    fund_name: str
    cik: str
    latest_filing_date: str | None = None
    latest_period: str | None = None
    prev_filing_date: str | None = None
    prev_period: str | None = None
    transactions: list[Transaction]
