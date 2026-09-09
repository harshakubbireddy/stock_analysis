from pydantic import BaseModel


class Trader(BaseModel):
    name: str
    last_name: str


class CongressTrade(BaseModel):
    politician: str
    owner: str | None = None
    asset: str
    ticker: str | None = None
    asset_type: str | None = None
    transaction_type: str
    transaction_date: str | None = None
    amount_min: int | None = None
    amount_max: int | None = None
    amount_label: str
    description: str | None = None
    filing_date: str
    pdf_url: str


class CongressTradesResponse(BaseModel):
    query: str
    filer: str
    trades: list[CongressTrade]
