import yfinance as yf

from app.core.cache import cached_model, store_model
from app.schemas.trending import TrendingResponse, TrendingStock

RESULT_LIMIT = 6
CACHE_TTL_SECONDS = 300


def _screen(query: str) -> list[TrendingStock]:
    result = yf.screen(query, count=RESULT_LIMIT)
    stocks: list[TrendingStock] = []
    for quote in result.get("quotes", [])[:RESULT_LIMIT]:
        price = quote.get("regularMarketPrice")
        change_percent = quote.get("regularMarketChangePercent")
        stocks.append(
            TrendingStock(
                symbol=quote.get("symbol", ""),
                name=quote.get("shortName") or quote.get("longName") or "",
                price=round(price, 2) if price is not None else None,
                change_percent=(
                    round(change_percent, 2) if change_percent is not None else None
                ),
                volume=quote.get("regularMarketVolume"),
            )
        )
    return stocks


def get_trending() -> TrendingResponse:
    key = "trending"
    hit = cached_model(key, TrendingResponse, ttl=CACHE_TTL_SECONDS)
    if hit is not None:
        return hit

    result = TrendingResponse(
        most_active=_screen("most_actives"),
        gainers=_screen("day_gainers"),
        losers=_screen("day_losers"),
    )
    store_model(key, result)
    return result
