from fastapi import APIRouter, Query

from app.schemas.market import MarketOverviewResponse
from app.schemas.sentiment import FngDetailResponse, SentimentOverviewResponse
from app.schemas.stock_detail import NewsFeedResponse, StockDetail
from app.schemas.trending import TrendingResponse
from app.services.market_data import get_market_overview
from app.services.sentiment import (
    get_cnn_fng_detail,
    get_crypto_fng_detail,
    get_sentiment_overview,
)
from app.services.stock_detail import (
    get_google_news_feed,
    get_news_feed,
    get_stock_detail,
)
from app.services.trending import get_trending

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/overview", response_model=MarketOverviewResponse)
def market_overview() -> MarketOverviewResponse:
    return get_market_overview()


@router.get("/sentiment", response_model=SentimentOverviewResponse)
def sentiment_overview() -> SentimentOverviewResponse:
    return get_sentiment_overview()


@router.get("/sentiment/crypto-fng", response_model=FngDetailResponse)
def crypto_fng_detail() -> FngDetailResponse:
    return get_crypto_fng_detail()


@router.get("/sentiment/cnn-fng", response_model=FngDetailResponse)
def cnn_fng_detail() -> FngDetailResponse:
    return get_cnn_fng_detail()


@router.get("/trending", response_model=TrendingResponse)
def trending() -> TrendingResponse:
    return get_trending()


@router.get("/stock/{symbol}", response_model=StockDetail)
def stock_detail(symbol: str) -> StockDetail:
    return get_stock_detail(symbol)


@router.get("/news", response_model=NewsFeedResponse)
def news_feed(symbols: str = Query(default="AAPL,MSFT,NVDA")) -> NewsFeedResponse:
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:6]
    return get_news_feed(symbol_list)


@router.get("/news/more", response_model=NewsFeedResponse)
def news_feed_more(symbols: str = Query(default="AAPL,MSFT,NVDA")) -> NewsFeedResponse:
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:6]
    return get_google_news_feed(symbol_list)
