"""Schema for the per-symbol stock analysis chat component.

Pulls as much as yfinance exposes: quote, 52-week range, valuation,
growth, profitability, balance sheet, analyst targets + recommendations,
1-month daily sparkline, intraday 5m bars, and earnings calendar.
"""
from pydantic import BaseModel


class ChartPoint(BaseModel):
    time: str
    price: float


class AnalystRecommendations(BaseModel):
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0
    consensus: str = "N/A"
    num_analysts: int = 0


class AnalystTargets(BaseModel):
    low: float | None = None
    mean: float | None = None
    median: float | None = None
    high: float | None = None
    upside_pct: float | None = None  # vs current price


class EarningsCalendar(BaseModel):
    earnings_date: str | None = None
    eps_estimate_low: float | None = None
    eps_estimate_high: float | None = None
    eps_estimate_avg: float | None = None
    revenue_estimate_low: float | None = None
    revenue_estimate_high: float | None = None
    revenue_estimate_avg: float | None = None
    dividend_date: str | None = None
    ex_dividend_date: str | None = None


class FinancialPeriod(BaseModel):
    period: str  # e.g. "2025-09-30" or "2026-06-30"
    revenue: float | None = None
    gross_profit: float | None = None
    operating_income: float | None = None
    net_income: float | None = None
    ebitda: float | None = None
    eps: float | None = None
    rd: float | None = None
    total_debt: float | None = None
    stockholders_equity: float | None = None
    total_assets: float | None = None
    current_assets: float | None = None
    current_liabilities: float | None = None
    cash: float | None = None
    free_cashflow: float | None = None
    operating_cashflow: float | None = None
    capex: float | None = None
    buybacks: float | None = None


class Financials(BaseModel):
    annual: list[FinancialPeriod] = []
    quarterly: list[FinancialPeriod] = []


class StockAnalysisResponse(BaseModel):
    symbol: str
    name: str
    exchange: str | None = None
    currency: str | None = None
    sector: str | None = None
    industry: str | None = None
    country: str | None = None
    website: str | None = None
    employees: int | None = None
    description: str | None = None

    # Quote
    price: float | None = None
    previous_close: float | None = None
    change: float | None = None
    change_percent: float | None = None
    open: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    volume: int | None = None
    avg_volume: int | None = None
    market_cap: int | None = None
    enterprise_value: int | None = None

    # 52-week + moving averages
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    fifty_day_avg: float | None = None
    two_hundred_day_avg: float | None = None
    fifty_two_week_position_pct: float | None = None  # 0=low, 100=high

    # Valuation
    trailing_pe: float | None = None
    forward_pe: float | None = None
    peg_ratio: float | None = None
    price_to_book: float | None = None
    price_to_sales: float | None = None
    eps_trailing: float | None = None
    eps_forward: float | None = None

    # Dividends
    dividend_rate: float | None = None
    dividend_yield: float | None = None
    payout_ratio: float | None = None

    # Growth
    earnings_growth: float | None = None
    revenue_growth: float | None = None
    earnings_quarterly_growth: float | None = None

    # Profitability
    gross_margin: float | None = None
    operating_margin: float | None = None
    profit_margin: float | None = None
    return_on_equity: float | None = None
    return_on_assets: float | None = None

    # Balance sheet
    total_cash: int | None = None
    total_debt: int | None = None
    debt_to_equity: float | None = None
    current_ratio: float | None = None
    free_cashflow: int | None = None
    operating_cashflow: int | None = None

    # Short interest
    short_ratio: float | None = None
    short_percent_of_float: float | None = None

    # Beta
    beta: float | None = None

    # Analyst
    analyst_targets: AnalystTargets = AnalystTargets()
    recommendations: AnalystRecommendations = AnalystRecommendations()

    # Calendar
    calendar: EarningsCalendar = EarningsCalendar()

    # Charts
    sparkline_1mo: list[ChartPoint] = []
    intraday: list[ChartPoint] = []

    # Financials — annual (most recent first) + quarterly (most recent first)
    financials: Financials = Financials()

    # Summary line for the agent
    summary: str = ""
    error: str | None = None
