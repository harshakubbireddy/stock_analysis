import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx
import yfinance as yf

from app.schemas.stock_detail import ChartPoint, NewsFeedResponse, NewsItem, StockDetail

NEWS_PER_SYMBOL = 3
NEWS_FEED_LIMIT = 9
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"


def _round(value: object, digits: int = 2) -> float | None:
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def get_stock_detail(symbol: str) -> StockDetail:
    ticker = yf.Ticker(symbol)
    detail = StockDetail(symbol=symbol, name=symbol)

    try:
        info = ticker.info
        detail.name = info.get("shortName") or info.get("longName") or symbol
        detail.trailing_pe = _round(info.get("trailingPE"))
    except Exception:
        pass

    try:
        fast = ticker.fast_info
        detail.price = _round(fast.get("lastPrice"))
        detail.previous_close = _round(fast.get("previousClose"))
        detail.day_high = _round(fast.get("dayHigh"))
        detail.day_low = _round(fast.get("dayLow"))
        detail.fifty_two_week_high = _round(fast.get("yearHigh"))
        detail.fifty_two_week_low = _round(fast.get("yearLow"))
        detail.market_cap = fast.get("marketCap")
        detail.volume = fast.get("regularMarketVolume") or fast.get("lastVolume")
    except Exception:
        pass

    if detail.price is not None and detail.previous_close:
        change = detail.price - detail.previous_close
        detail.change = round(change, 2)
        detail.change_percent = round(change / detail.previous_close * 100, 2)

    try:
        history = ticker.history(period="1d", interval="5m")
        detail.intraday = [
            ChartPoint(time=index.isoformat(), price=round(float(close), 2))
            for index, close in history["Close"].dropna().items()
        ]
    except Exception:
        pass

    return detail


def _parse_news_item(item: dict, symbol: str) -> NewsItem | None:
    content = item.get("content", item)
    title = content.get("title")
    if not title:
        return None

    url = content.get("link")
    published = content.get("providerPublishTime")
    if published is not None:
        published = datetime.fromtimestamp(published, tz=timezone.utc).isoformat()

    canonical = content.get("canonicalUrl") or {}
    click_through = content.get("clickThroughUrl") or {}
    provider = content.get("provider") or {}

    return NewsItem(
        title=title,
        summary=content.get("summary"),
        publisher=content.get("publisher") or provider.get("displayName"),
        url=url or canonical.get("url") or click_through.get("url"),
        published=published or content.get("pubDate") or content.get("displayTime"),
        symbol=symbol,
    )


def _google_news_for_symbol(symbol: str, count: int) -> list[NewsItem]:
    response = httpx.get(
        GOOGLE_NEWS_RSS,
        params={
            "q": f"{symbol} stock",
            "hl": "en-US",
            "gl": "US",
            "ceid": "US:en",
        },
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10,
        follow_redirects=True,
    )
    response.raise_for_status()
    root = ET.fromstring(response.text)

    items: list[NewsItem] = []
    for element in root.findall("./channel/item")[:count]:
        title = element.findtext("title") or ""
        source_element = element.find("source")
        publisher = source_element.text if source_element is not None else None
        if publisher and title.endswith(f" - {publisher}"):
            title = title[: -len(f" - {publisher}")]

        published = None
        pub_date = element.findtext("pubDate")
        if pub_date:
            try:
                published = parsedate_to_datetime(pub_date).isoformat()
            except (TypeError, ValueError):
                published = None

        if title:
            items.append(
                NewsItem(
                    title=title,
                    publisher=publisher,
                    url=element.findtext("link"),
                    published=published,
                    symbol=symbol,
                )
            )
    return items


def get_google_news_feed(symbols: list[str]) -> NewsFeedResponse:
    items: list[NewsItem] = []
    seen_keys: set[str] = set()
    for symbol in symbols:
        try:
            fetched = _google_news_for_symbol(symbol, NEWS_PER_SYMBOL)
        except (httpx.HTTPError, ET.ParseError):
            continue
        for item in fetched:
            key = item.url or item.title
            if key in seen_keys:
                continue
            seen_keys.add(key)
            items.append(item)

    items.sort(key=lambda item: item.published or "", reverse=True)
    return NewsFeedResponse(items=items[:NEWS_FEED_LIMIT])


def get_news_feed(symbols: list[str]) -> NewsFeedResponse:
    items: list[NewsItem] = []
    seen_urls: set[str] = set()
    for symbol in symbols:
        try:
            news = yf.Ticker(symbol).news
        except Exception:
            continue
        for raw in news[:NEWS_PER_SYMBOL]:
            parsed = _parse_news_item(raw, symbol)
            if parsed is None:
                continue
            key = parsed.url or parsed.title
            if key in seen_urls:
                continue
            seen_urls.add(key)
            items.append(parsed)

    if not items:
        return get_google_news_feed(symbols)

    items.sort(key=lambda item: item.published or "", reverse=True)
    return NewsFeedResponse(items=items[:NEWS_FEED_LIMIT])
