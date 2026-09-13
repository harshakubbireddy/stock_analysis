"""Tools the AI agent can call.

Tools that return a dict with a "component" key produce UI components.
Tools that return a string produce text answers — and go back to the agent
so it can summarize the result into its reply.
The @tool docstring tells the LLM when to call each tool.
"""
from langchain_core.tools import tool

from app.services.macro import (
    get_bond_market_overview,
    get_cpi_report,
    get_upcoming_economic_events,
)
from app.services.market_data import get_market_overview
from app.services.smart_money_analysis import get_smart_money_analysis
from app.services.stock_analysis import get_stock_analysis


@tool
def greet_user() -> str:
    """Call this when the user says hi, hello, or greets you."""
    return (
        "Hi! How are you? How may I help you? "
        "I can help with stock-related queries."
    )


@tool
def stock_market_overview() -> dict:
    """Call this when the user asks about the overall stock market today."""
    data = get_market_overview()
    return {
        "component": "stock_market_overview",
        "props": data.model_dump(),
    }


@tool
def bond_market_overview() -> dict:
    """Call this when the user asks about the bond market, Treasury yields,
    yield curve, or fixed income today. This covers Treasury yields and bond
    ETFs only — for inflation/CPI use the cpi_report tool, and for the
    economic calendar use the upcoming_economic_events tool."""
    data = get_bond_market_overview()
    return {
        "component": "bond_market_overview",
        "props": data.model_dump(),
    }


@tool
def cpi_report() -> dict:
    """Call this when the user asks about inflation, CPI, consumer price
    index, or price data. This is separate from the bond market tool."""
    data = get_cpi_report()
    return {
        "component": "cpi_report",
        "props": data.model_dump(),
    }


@tool
def upcoming_economic_events() -> dict:
    """Call this when the user asks about upcoming economic events, the
    economic calendar, Fed events, or macro reports this week. This is
    separate from the bond market and CPI tools."""
    events = get_upcoming_economic_events()
    return {
        "component": "upcoming_economic_events",
        "props": {"events": [event.model_dump() for event in events]},
    }


@tool
def smart_money() -> dict:
    """Call this when the user asks about smart money, hedge fund moves,
    whale activity, institutional flows, what big funds (Berkshire,
    Bridgewater, Citadel, ARK, Soros...) are buying/selling, or
    congressional (politician) stock trading."""
    data = get_smart_money_analysis()
    return {
        "component": "smart_money",
        "props": data.model_dump(),
    }


@tool
def stock_analysis_by_symbol(symbol: str) -> dict:
    """Call this when the user asks about a specific stock by ticker symbol
    (e.g. AAPL, TSLA, MSFT, NVDA, GOOGL). Returns a full analysis: price,
    52-week range, valuation (PE, PEG, P/B), growth, profitability,
    balance sheet, analyst price targets + consensus, and charts. Always
    pass the ticker symbol in uppercase."""
    data = get_stock_analysis(symbol)
    return {
        "component": "stock_analysis_by_symbol",
        "props": data.model_dump(),
    }

