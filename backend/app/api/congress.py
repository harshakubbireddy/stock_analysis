from fastapi import APIRouter, Query

from app.schemas.congress import CongressTradesResponse, Trader
from app.services.congress import get_trades, get_traders

router = APIRouter(prefix="/api/congress", tags=["congress"])


@router.get("/traders", response_model=list[Trader])
def traders() -> list[Trader]:
    return get_traders()


@router.get("/trades", response_model=CongressTradesResponse)
def trades(name: str = Query(default="Pelosi")) -> CongressTradesResponse:
    return get_trades(name)
