"""Per-symbol stock analysis for the AI chat tool.

Pulls as much as yfinance exposes in one call: quote, 52-week range,
valuation, growth, profitability, balance sheet, analyst targets +
recommendations, 1-month daily sparkline, intraday 5m bars, and the
earnings calendar. Each section is wrapped defensively so a missing
field degrades gracefully instead of failing the whole response.
"""
from datetime import datetime, timezone

import yfinance as yf

from app.core.cache import cached_model, store_model
from app.schemas.stock_analysis import (
    AnalystRecommendations,
    AnalystTargets,
    ChartPoint,
    EarningsCalendar,
    FinancialPeriod,
    Financials,
    StockAnalysisResponse,
)

CACHE_TTL_SECONDS = 300


def _round(value: object, digits: int = 2) -> float | None:
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def _date_from_epoch(epoch: int | float | None) -> str | None:
    if not epoch:
        return None
    try:
        return datetime.fromtimestamp(int(epoch), tz=timezone.utc).date().isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _sparkline(history) -> list[ChartPoint]:
    points: list[ChartPoint] = []
    try:
        for index, close in history["Close"].dropna().items():
            points.append(
                ChartPoint(time=index.isoformat(), price=round(float(close), 2))
            )
    except Exception:
        pass
    return points


def _fifty_two_week_position(low, high, price) -> float | None:
    if low is None or high is None or price is None or high == low:
        return None
    return round((price - low) / (high - low) * 100, 1)


def _analyst_targets(info: dict, price: float | None) -> AnalystTargets:
    targets = AnalystTargets(
        low=_round(info.get("targetLowPrice")),
        mean=_round(info.get("targetMeanPrice")),
        median=_round(info.get("targetMedianPrice")),
        high=_round(info.get("targetHighPrice")),
    )
    if price and targets.mean:
        targets.upside_pct = round((targets.mean - price) / price * 100, 2)
    return targets


def _recommendations(ticker) -> AnalystRecommendations:
    rec = AnalystRecommendations(
        consensus=str(ticker.info.get("recommendationKey", "N/A")).title(),
        num_analysts=int(ticker.info.get("numberOfAnalystOpinions", 0) or 0),
    )
    try:
        df = ticker.recommendations
        if df is not None and len(df) > 0:
            latest = df.iloc[0]
            rec.strong_buy = int(latest.get("strongBuy", 0))
            rec.buy = int(latest.get("buy", 0))
            rec.hold = int(latest.get("hold", 0))
            rec.sell = int(latest.get("sell", 0))
            rec.strong_sell = int(latest.get("strongSell", 0))
    except Exception:
        pass
    return rec


def _financials(ticker) -> Financials:
    """Pull annual + quarterly financials from yfinance statements.

    Each statement (income_stmt, balance_sheet, cashflow) is a DataFrame
    with rows = line items, columns = periods (most-recent first).
    We normalize NaN → None and build a list of FinancialPeriod.
    """
    import math

    def safe(df, key):
        try:
            row = df.loc[key]
        except (KeyError, AttributeError):
            return [None] * (df.shape[1] if df is not None else 0)
        return [None if (v is None or (isinstance(v, float) and math.isnan(v))) else float(v) for v in row.tolist()]

    def periods(df):
        try:
            return [str(c).split(" ")[0] for c in df.columns]
        except Exception:
            return []

    def build(df_inc, df_bal, df_cf) -> list[FinancialPeriod]:
        if df_inc is None or df_inc.empty:
            return []
        dates = periods(df_inc)
        rev = safe(df_inc, "Total Revenue")
        gp = safe(df_inc, "Gross Profit")
        op = safe(df_inc, "Operating Income")
        ni = safe(df_inc, "Net Income")
        ebitda = safe(df_inc, "EBITDA")
        eps = safe(df_inc, "Basic EPS")
        rd = safe(df_inc, "Research And Development")
        debt = safe(df_bal, "Total Debt") if df_bal is not None else [None] * len(dates)
        eq = safe(df_bal, "Stockholders Equity") if df_bal is not None else [None] * len(dates)
        ta = safe(df_bal, "Total Assets") if df_bal is not None else [None] * len(dates)
        ca = safe(df_bal, "Current Assets") if df_bal is not None else [None] * len(dates)
        cl = safe(df_bal, "Current Liabilities") if df_bal is not None else [None] * len(dates)
        cash = (
            safe(df_bal, "Cash Cash Equivalents And Short Term Investments")
            if df_bal is not None
            else [None] * len(dates)
        )
        fcf = safe(df_cf, "Free Cash Flow") if df_cf is not None else [None] * len(dates)
        ocf = safe(df_cf, "Operating Cash Flow") if df_cf is not None else [None] * len(dates)
        capex = safe(df_cf, "Capital Expenditure") if df_cf is not None else [None] * len(dates)
        buybacks = safe(df_cf, "Repurchase Of Capital Stock") if df_cf is not None else [None] * len(dates)

        out: list[FinancialPeriod] = []
        for i, d in enumerate(dates):
            period = FinancialPeriod(
                period=d,
                revenue=rev[i] if i < len(rev) else None,
                gross_profit=gp[i] if i < len(gp) else None,
                operating_income=op[i] if i < len(op) else None,
                net_income=ni[i] if i < len(ni) else None,
                ebitda=ebitda[i] if i < len(ebitda) else None,
                eps=eps[i] if i < len(eps) else None,
                rd=rd[i] if i < len(rd) else None,
                total_debt=debt[i] if i < len(debt) else None,
                stockholders_equity=eq[i] if i < len(eq) else None,
                total_assets=ta[i] if i < len(ta) else None,
                current_assets=ca[i] if i < len(ca) else None,
                current_liabilities=cl[i] if i < len(cl) else None,
                cash=cash[i] if i < len(cash) else None,
                free_cashflow=fcf[i] if i < len(fcf) else None,
                operating_cashflow=ocf[i] if i < len(ocf) else None,
                capex=capex[i] if i < len(capex) else None,
                buybacks=buybacks[i] if i < len(buybacks) else None,
            )
            # Skip periods where every key value is None (empty columns)
            if all(v is None for v in (
                period.revenue, period.net_income, period.total_assets,
                period.free_cashflow, period.total_debt,
            )):
                continue
            out.append(period)
        return out

    annual: list[FinancialPeriod] = []
    quarterly: list[FinancialPeriod] = []
    try:
        annual = build(ticker.income_stmt, ticker.balance_sheet, ticker.cashflow)
    except Exception:
        pass
    try:
        quarterly = build(
            ticker.quarterly_income_stmt,
            ticker.quarterly_balance_sheet,
            ticker.quarterly_cashflow,
        )
    except Exception:
        pass
    return Financials(annual=annual, quarterly=quarterly)


def _calendar(ticker) -> EarningsCalendar:
    cal = EarningsCalendar()
    try:
        raw = ticker.calendar
        if not raw:
            return cal
        earnings_dates = raw.get("Earnings Date")
        if earnings_dates:
            first = earnings_dates[0] if isinstance(earnings_dates, list) else earnings_dates
            cal.eps_estimate_low = _round(raw.get("Earnings Low"))
            cal.eps_estimate_high = _round(raw.get("Earnings High"))
            cal.eps_estimate_avg = _round(raw.get("Earnings Average"))
            cal.revenue_estimate_low = raw.get("Revenue Low")
            cal.revenue_estimate_high = raw.get("Revenue High")
            cal.revenue_estimate_avg = raw.get("Revenue Average")
            if hasattr(first, "isoformat"):
                cal.earnings_date = first.isoformat()
            else:
                cal.earnings_date = str(first)
        div_date = raw.get("Dividend Date")
        if div_date and hasattr(div_date, "isoformat"):
            cal.dividend_date = div_date.isoformat()
        ex_div = raw.get("Ex-Dividend Date")
        if ex_div and hasattr(ex_div, "isoformat"):
            cal.ex_dividend_date = ex_div.isoformat()
    except Exception:
        pass
    return cal


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
