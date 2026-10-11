from datetime import datetime, timezone

from app.schemas.stock_analysis import (
    AnalystRecommendations,
    AnalystTargets,
    ChartPoint,
    EarningsCalendar,
    FinancialPeriod,
    Financials,
    TechnicalIndicators,
)


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
        fields = [
            ("revenue", df_inc, "Total Revenue"),
            ("gross_profit", df_inc, "Gross Profit"),
            ("operating_income", df_inc, "Operating Income"),
            ("net_income", df_inc, "Net Income"),
            ("ebitda", df_inc, "EBITDA"),
            ("eps", df_inc, "Basic EPS"),
            ("rd", df_inc, "Research And Development"),
            ("total_debt", df_bal, "Total Debt"),
            ("stockholders_equity", df_bal, "Stockholders Equity"),
            ("total_assets", df_bal, "Total Assets"),
            ("current_assets", df_bal, "Current Assets"),
            ("current_liabilities", df_bal, "Current Liabilities"),
            ("cash", df_bal, "Cash Cash Equivalents And Short Term Investments"),
            ("free_cashflow", df_cf, "Free Cash Flow"),
            ("operating_cashflow", df_cf, "Operating Cash Flow"),
            ("capex", df_cf, "Capital Expenditure"),
            ("buybacks", df_cf, "Repurchase Of Capital Stock"),
        ]
        values = {
            field: safe(statement, key) if statement is not None else [None] * len(dates)
            for field, statement, key in fields
        }

        out: list[FinancialPeriod] = []
        for i, date in enumerate(dates):
            period = FinancialPeriod(
                period=date,
                **{
                    field: row[i] if i < len(row) else None
                    for field, row in values.items()
                },
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


def _last(series) -> float | None:
    """Last non-NaN value of a pandas Series, or None."""
    try:
        clean = series.dropna()
        return float(clean.iloc[-1]) if len(clean) else None
    except Exception:
        return None


def _pct_diff(price: float | None, ref: float | None) -> float | None:
    if price is None or not ref:
        return None
    return round((price - ref) / ref * 100, 2)


def _technicals(history) -> TechnicalIndicators:
    """Compute trend / momentum / volatility indicators from daily OHLC history.

    Expects >= ~200 rows for SMA200; shorter histories simply leave the
    long-window fields as None. Every indicator is wrapped so one failure
    doesn't blank the rest.
    """
    from ta.momentum import RSIIndicator
    from ta.trend import EMAIndicator, MACD, SMAIndicator
    from ta.volatility import AverageTrueRange, BollingerBands

    tech = TechnicalIndicators()
    try:
        close = history["Close"].dropna()
    except Exception:
        return tech
    if len(close) < 20:
        return tech

    price = float(close.iloc[-1])
    n = len(close)

    # Moving averages
    try:
        tech.ema_20 = _round(_last(EMAIndicator(close, window=20).ema_indicator()))
        if n >= 50:
            tech.sma_50 = _round(_last(SMAIndicator(close, window=50).sma_indicator()))
            tech.ema_50 = _round(_last(EMAIndicator(close, window=50).ema_indicator()))
        if n >= 200:
            tech.sma_200 = _round(_last(SMAIndicator(close, window=200).sma_indicator()))
    except Exception:
        pass
    tech.price_vs_sma50_pct = _pct_diff(price, tech.sma_50)
    tech.price_vs_sma200_pct = _pct_diff(price, tech.sma_200)

    # Trend classification: price vs 50 DMA vs 200 DMA
    s50, s200 = tech.sma_50, tech.sma_200
    if s50 is not None and s200 is not None:
        tech.golden_cross = s50 > s200
        if price > s50 > s200:
            tech.trend = "uptrend"
            tech.trend_detail = "Price above 50 DMA, 50 DMA above 200 DMA (golden cross)"
        elif price < s50 < s200:
            tech.trend = "downtrend"
            tech.trend_detail = "Price below 50 DMA, 50 DMA below 200 DMA (death cross)"
        else:
            tech.trend = "neutral"
            tech.trend_detail = (
                f"Mixed: price {'above' if price > s50 else 'below'} 50 DMA, "
                f"50 DMA {'above' if s50 > s200 else 'below'} 200 DMA"
            )
    elif s50 is not None:
        tech.trend = "uptrend" if price > s50 else "downtrend"
        tech.trend_detail = f"Price {'above' if price > s50 else 'below'} 50 DMA (200 DMA unavailable)"

    # RSI
    try:
        tech.rsi_14 = _round(_last(RSIIndicator(close, window=14).rsi()))
        if tech.rsi_14 is not None:
            tech.rsi_signal = (
                "overbought" if tech.rsi_14 >= 70 else "oversold" if tech.rsi_14 <= 30 else "neutral"
            )
    except Exception:
        pass

    # MACD (12/26/9)
    try:
        if n >= 35:
            macd = MACD(close)
            tech.macd = _round(_last(macd.macd()), 3)
            tech.macd_signal = _round(_last(macd.macd_signal()), 3)
            tech.macd_hist = _round(_last(macd.macd_diff()), 3)
            if tech.macd_hist is not None:
                tech.macd_trend = "bullish" if tech.macd_hist > 0 else "bearish" if tech.macd_hist < 0 else "neutral"
    except Exception:
        pass

    # Bollinger Bands (20, 2σ)
    try:
        bb = BollingerBands(close, window=20, window_dev=2)
        tech.bb_upper = _round(_last(bb.bollinger_hband()))
        tech.bb_lower = _round(_last(bb.bollinger_lband()))
        if tech.bb_upper is not None and tech.bb_lower is not None and tech.bb_upper != tech.bb_lower:
            tech.bb_position_pct = round((price - tech.bb_lower) / (tech.bb_upper - tech.bb_lower) * 100, 1)
            tech.bb_signal = (
                "above_upper" if price > tech.bb_upper else "below_lower" if price < tech.bb_lower else "neutral"
            )
    except Exception:
        pass

    # ATR (14)
    try:
        high, low = history["High"], history["Low"]
        tech.atr_14 = _round(_last(AverageTrueRange(high, low, history["Close"], window=14).average_true_range()))
    except Exception:
        pass

    return tech


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
