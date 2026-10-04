"""Per-symbol stock analysis for the AI chat tool.

Pulls as much as yfinance exposes in one call: quote, 52-week range,
valuation, growth, profitability, balance sheet, analyst targets +
recommendations, 1-month daily sparkline, intraday 5m bars, and the
earnings calendar. Each section is wrapped defensively so a missing
field degrades gracefully instead of failing the whole response.
"""
import yfinance as yf

from app.core.cache import cached_model, store_model
from app.schemas.stock_analysis import StockAnalysisResponse
from app.services.stock_analysis_helpers import (
    _analyst_targets,
    _calendar,
    _date_from_epoch,
    _fifty_two_week_position,
    _financials,
    _recommendations,
    _round,
    _sparkline,
)

CACHE_TTL_SECONDS = 300


def get_stock_analysis(symbol: str) -> StockAnalysisResponse:
    symbol = symbol.strip().upper()
    key = f"stock_analysis:{symbol}"
    hit = cached_model(key, StockAnalysisResponse, ttl=CACHE_TTL_SECONDS)
    if hit is not None:
        return hit

    ticker = yf.Ticker(symbol)
    result = StockAnalysisResponse(symbol=symbol, name=symbol)

    try:
        info = ticker.info
    except Exception:
        info = {}

    if not info:
        result.error = f"No data found for symbol '{symbol}'"
        return result

    result.name = info.get("shortName") or info.get("longName") or info.get("displayName") or symbol
    result.exchange = info.get("fullExchangeName") or info.get("exchange")
    result.currency = info.get("currency")
    result.sector = info.get("sector")
    result.industry = info.get("industry")
    result.country = info.get("country")
    result.website = info.get("website")
    result.employees = info.get("fullTimeEmployees")
    result.description = info.get("longBusinessSummary")

    # Quote
    result.price = _round(info.get("currentPrice") or info.get("regularMarketPrice"))
    result.previous_close = _round(info.get("regularMarketPreviousClose") or info.get("previousClose"))
    result.open = _round(info.get("regularMarketOpen") or info.get("open"))
    result.day_high = _round(info.get("regularMarketDayHigh") or info.get("dayHigh"))
    result.day_low = _round(info.get("regularMarketDayLow") or info.get("dayLow"))
    result.volume = info.get("regularMarketVolume") or info.get("volume")
    result.avg_volume = info.get("averageVolume") or info.get("averageDailyVolume3Month")
    result.market_cap = info.get("marketCap")
    result.enterprise_value = info.get("enterpriseValue")

    if result.price is not None and result.previous_close:
        change = result.price - result.previous_close
        result.change = round(change, 2)
        result.change_percent = round(change / result.previous_close * 100, 2)

    # 52-week + moving averages
    result.fifty_two_week_high = _round(info.get("fiftyTwoWeekHigh"))
    result.fifty_two_week_low = _round(info.get("fiftyTwoWeekLow"))
    result.fifty_day_avg = _round(info.get("fiftyDayAverage"))
    result.two_hundred_day_avg = _round(info.get("twoHundredDayAverage"))
    result.fifty_two_week_position_pct = _fifty_two_week_position(
        result.fifty_two_week_low, result.fifty_two_week_high, result.price
    )

    # Valuation
    result.trailing_pe = _round(info.get("trailingPE"))
    result.forward_pe = _round(info.get("forwardPE"))
    result.peg_ratio = _round(info.get("pegRatio") or info.get("trailingPegRatio"))
    result.price_to_book = _round(info.get("priceToBook"))
    result.price_to_sales = _round(info.get("priceToSalesTrailing12Months"))
    result.eps_trailing = _round(info.get("trailingEps"))
    result.eps_forward = _round(info.get("forwardEps"))

    # Dividends
    result.dividend_rate = _round(info.get("dividendRate"))
    result.dividend_yield = _round(info.get("dividendYield"))
    result.payout_ratio = _round(info.get("payoutRatio"))

    # Growth
    result.earnings_growth = _round(info.get("earningsGrowth"))
    result.revenue_growth = _round(info.get("revenueGrowth"))
    result.earnings_quarterly_growth = _round(info.get("earningsQuarterlyGrowth"))

    # Profitability (yfinance gives these as decimals, e.g. 0.276 = 27.6%)
    result.gross_margin = _round(info.get("grossMargins"))
    result.operating_margin = _round(info.get("operatingMargins"))
    result.profit_margin = _round(info.get("profitMargins"))
    result.return_on_equity = _round(info.get("returnOnEquity"))
    result.return_on_assets = _round(info.get("returnOnAssets"))

    # Balance sheet
    result.total_cash = info.get("totalCash")
    result.total_debt = info.get("totalDebt")
    result.debt_to_equity = _round(info.get("debtToEquity"))
    result.current_ratio = _round(info.get("currentRatio"))
    result.free_cashflow = info.get("freeCashflow")
    result.operating_cashflow = info.get("operatingCashflow")

    # Short interest
    result.short_ratio = _round(info.get("shortRatio"))
    result.short_percent_of_float = _round(info.get("shortPercentOfFloat"))

    # Beta
    result.beta = _round(info.get("beta"))

    # Analyst
    result.analyst_targets = _analyst_targets(info, result.price)
    result.recommendations = _recommendations(ticker)
    result.calendar = _calendar(ticker)

    # Financials (annual + quarterly)
    result.financials = _financials(ticker)

    # Charts
    try:
        result.sparkline_1mo = _sparkline(ticker.history(period="1mo", interval="1d"))
    except Exception:
        pass
    try:
        result.intraday = _sparkline(ticker.history(period="1d", interval="5m"))
    except Exception:
        pass

    # One-line summary for the agent to phrase
    direction = "up" if (result.change or 0) >= 0 else "down"
    pct = f"{abs(result.change_percent):.2f}%" if result.change_percent is not None else "N/A"
    consensus = result.recommendations.consensus
    upside = (
        f", analyst target {result.analyst_targets.mean:.0f} "
        f"({result.analyst_targets.upside_pct:+.1f}% upside)"
        if result.analyst_targets.mean and result.analyst_targets.upside_pct is not None
        else ""
    )
    result.summary = (
        f"{result.name} ({symbol}) is {direction} {pct} today at "
        f"{result.price:.2f} {result.currency or ''}. "
        f"Consensus: {consensus}{upside}."
    )

    store_model(key, result)
    return result
