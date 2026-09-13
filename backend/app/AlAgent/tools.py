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
    or fixed income today."""
    data = get_bond_market_overview()
    return {
        "component": "bond_market_overview",
        "props": data.model_dump(),
    }


@tool
def cpi_report() -> dict:
    """Call this when the user asks about inflation, CPI, or
    consumer price index data."""
    data = get_cpi_report()
    return {
        "component": "cpi_report",
        "props": data.model_dump(),
    }


@tool
def upcoming_economic_events() -> dict:
    """Call this when the user asks about upcoming economic events,
    the economic calendar, Fed events, or macro reports this week."""
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
def stock_analysis() -> dict:
    """Call this when the user asks about a specific stock's analysis."""
    return {
        "component": "stock_analysis",
        "props": {"summary": "Stock analysis data goes here"},
    }
