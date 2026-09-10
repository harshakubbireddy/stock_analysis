"""Tools the AI agent can call.

Tools that return a dict with a "component" key produce UI components.
Tools that return a string produce text answers.
The @tool docstring tells the LLM when to call each tool.
"""
from langchain_core.tools import tool


@tool
def greet_user() -> str:
    """Call this when the user says hi, hello, or greets you."""
    return (
        "Hi! How are you? How may I help you? "
        "I can help with stock-related queries."
    )


@tool
def get_market_overview() -> dict:
    """Call this when the user asks about the overall market today."""
    return {
        "component": "market_overview",
        "props": {"summary": "Market is up Today"},
    }
