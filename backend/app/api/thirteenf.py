from fastapi import APIRouter

from app.schemas.thirteenf import Fund, HoldingsResponse, TransactionsResponse
from app.services.thirteenf import get_funds, get_latest_holdings, get_latest_transactions

router = APIRouter(prefix="/api/thirteenf", tags=["thirteenf"])


@router.get("/funds", response_model=list[Fund])
def funds() -> list[Fund]:
    return get_funds()


@router.get("/holdings/{cik}", response_model=HoldingsResponse)
def holdings(cik: str) -> HoldingsResponse:
    return get_latest_holdings(cik)


@router.get("/transactions/{cik}", response_model=TransactionsResponse)
def transactions(cik: str) -> TransactionsResponse:
    return get_latest_transactions(cik)
