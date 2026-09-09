import pandas as pd
import yfinance as yf

from app.schemas.market import MarketOverviewResponse, MarketQuote

US_INDICES = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq Composite"),
    ("^DJI", "Dow Jones"),
    ("^RUT", "Russell 2000"),
]

INDIA_INDICES = [
    ("^NSEI", "Nifty 50"),
    ("^BSESN", "BSE Sensex"),
]

CRYPTO_ASSETS = [
    ("BTC-USD", "Bitcoin"),
    ("ETH-USD", "Ethereum"),
]

US_SECTOR_ETFS = [
    ("XLK", "Technology"),
    ("XLC", "Communication Services"),
    ("XLY", "Consumer Discretionary"),
    ("XLP", "Consumer Staples"),
    ("XLE", "Energy"),
    ("XLF", "Financials"),
    ("XLV", "Health Care"),
    ("XLI", "Industrials"),
    ("XLB", "Materials"),
    ("XLRE", "Real Estate"),
    ("XLU", "Utilities"),
]


def _closes_for(data: pd.DataFrame, symbol: str, multi: bool) -> pd.Series:
    closes = data[symbol]["Close"] if multi else data["Close"]
    return closes.dropna()


def _download(symbols: list[str], period: str, interval: str) -> tuple[pd.DataFrame, bool]:
    data = yf.download(
        symbols,
        period=period,
        interval=interval,
        group_by="ticker",
        threads=True,
        progress=False,
        auto_adjust=False,
    )
    return data, isinstance(data.columns, pd.MultiIndex)


def _fetch_quotes(symbols_with_names: list[tuple[str, str]]) -> list[MarketQuote]:
    symbols = [symbol for symbol, _ in symbols_with_names]
    daily, daily_multi = _download(symbols, period="5d", interval="1d")
    hourly, hourly_multi = _download(symbols, period="1d", interval="1h")

    quotes: list[MarketQuote] = []
    for symbol, name in symbols_with_names:
        quote = MarketQuote(symbol=symbol, name=name)
        try:
            closes = _closes_for(daily, symbol, daily_multi)
            if len(closes) >= 2:
                last = float(closes.iloc[-1])
                prev = float(closes.iloc[-2])
                change = last - prev
                quote.price = round(last, 2)
                quote.change = round(change, 2)
                quote.change_percent = round(change / prev * 100, 2)
        except (KeyError, IndexError, TypeError, ZeroDivisionError):
            pass
        try:
            bars = _closes_for(hourly, symbol, hourly_multi)
            quote.sparkline = [round(float(value), 2) for value in bars]
        except (KeyError, IndexError, TypeError):
            pass
        quotes.append(quote)
    return quotes


def get_market_overview() -> MarketOverviewResponse:
    return MarketOverviewResponse(
        usa=_fetch_quotes(US_INDICES),
        india=_fetch_quotes(INDIA_INDICES),
        crypto=_fetch_quotes(CRYPTO_ASSETS),
        usa_sectors=_fetch_quotes(US_SECTOR_ETFS),
    )
