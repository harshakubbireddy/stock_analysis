"""LangGraph agent: guardrail → agent (LLM + tools) → tools → (agent | news) → END

Flow:
  User message
      │
      ▼
  ┌──────────┐
  │ guardrail │ ── off topic ──→ rejection message ──→ END
  │ (classify)│ ── on topic ──┐
  └──────────┘                │
                              ▼
                      ┌──────────┐
                      │  agent   │ ── no tool calls ──────┐
                      │ (LLM +   │ ── has tool calls ──┐  │
                      │  tools)  │                    │  │
                      └──────────┘                    ▼  │
                                             ┌──────────┐│
                                             │  tools   ││
                                             │(execute) ││
                                             └────┬─────┘│
                                    text result │        │ component result
                                                ▼        │
                                              agent ─────┘
                                                        │
                                            (final answer)
                                                        ▼
                                                ┌──────────────┐
                                                │  news node   │
                                                │ LLM picks    │
                                                │ query → fetch│
                                                │ → summarize  │
                                                └──────┬───────┘
                                                       ▼
                                                      END
"""
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.AlAgent.llm import llm, SYSTEM_PROMPT
from app.AlAgent.tools import (
    bond_market_overview,
    cpi_report,
    greet_user,
    smart_money,
    stock_analysis,
    stock_market_overview,
    upcoming_economic_events,
)
from app.services.stock_detail import get_news_for_query

# Bind tools to the LLM so it can decide to call them
tools = [
    greet_user,
    stock_market_overview,
    bond_market_overview,
    cpi_report,
    upcoming_economic_events,
    smart_money,
    stock_analysis,
]
llm_with_tools = llm.bind_tools(tools)


# State: a list of messages that accumulates as nodes run, plus the latest
# fetched news items (written by the news node, read by the API for the UI card).
class State(TypedDict):
    messages: Annotated[list, add_messages]
    news_items: list


# --- Node 1: Guardrail ---
def guardrail_node(state: State) -> dict:
    """Ask the LLM: is this question about stocks/bonds/economy?
    If no, return a polite rejection (and the graph ends).
    If yes, return {} (no changes) and the graph continues to the agent.
    """
    user_msg = state["messages"][-1]
    check = llm.invoke([
        SystemMessage(
            "Is this message about stocks, bonds, economy, inflation, "
            "hedge funds / institutional investors, congressional trading, "
            "or a greeting (hi, hello, hey)? Answer only 'yes' or 'no'."
        ),
        user_msg,
    ])
    if check.content.strip().lower() == "no":
        return {"messages": [AIMessage(
            "I can only help with stock, bond, and economy-related questions. "
            "Could you ask something in those areas?"
        )]}
    return {}  # on-topic: pass through unchanged


def route_after_guardrail(state: State) -> str:
    """If the guardrail added a rejection (AIMessage), go to END.
    Otherwise (last message is still the HumanMessage), go to the agent.
    """
    last = state["messages"][-1]
    if isinstance(last, AIMessage):
        return END  # rejection — we're done
    return "agent"


# --- Node 2: Agent ---
def agent_node(state: State) -> dict:
    """The LLM sees the system prompt + conversation and decides:
    - respond directly (no tools), or
    - call a tool (market overview, stock analysis, etc.)
    """
    messages = [SYSTEM_PROMPT] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


def should_continue(state: State) -> str:
    """After the agent responds:
    - if it called tools → go to tools node
    - if it didn't → go to news node
    """
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "news"


# --- Node 3: Tools ---
# ToolNode is a prebuilt node that executes whatever tools the agent called,
# then returns ToolMessages with the results.

def route_after_tools(state: State) -> str:
    """After tools run, look at the batch of new ToolMessages (in reverse):
    - any plain text result (e.g. greet_user) → back to agent to phrase it
    - all UI components → go to the news node (components already streamed)
    """
    for msg in reversed(state["messages"]):
        if not isinstance(msg, ToolMessage):
            break  # stop when we hit something that isn't a tool result
        if isinstance(msg.content, str) and '"component"' in msg.content:
            continue  # component result — check earlier tool results too
        return "agent"  # plain text result — agent must phrase it
    return "news"


# --- Node 4: News (always runs for on-topic questions) ---
def news_node(state: State) -> dict:
    """Deterministic news step — cannot be skipped:
    1. LLM turns the user's question into a search query
    2. Fetch latest headlines from Google News
    3. LLM summarizes the headlines and shares its take
    """
    # The user's question is the first human message.
    question = next(
        (m.content for m in state["messages"] if isinstance(m, HumanMessage)), ""
    )

    # Step 1: LLM picks the search query
    query_msg = llm.invoke([
        SystemMessage(
            "Convert the user's question into a short Google News search query "
            "(a stock symbol, index, or market topic). Reply with ONLY the query."
        ),
        HumanMessage(question),
    ])
    query = query_msg.content.strip()

    # Step 2: fetch news
    feed = get_news_for_query(query)

    # Step 3: LLM summarizes + shares its take
    headlines = "\n".join(f"- {i.title} ({i.publisher})" for i in feed.items)
    summary_msg = llm.invoke([
        SystemMessage(
            "Summarize these headlines for the user's question, then share your "
            "take. Be concise and base everything on the headlines. "
            "Education, not financial advice. "
            f"Headlines:\n{headlines or 'No recent headlines found.'}"
        ),
        HumanMessage(question),
    ])

    return {
        "messages": [summary_msg],
        "news_items": [i.model_dump() for i in feed.items],
    }


# --- Build the graph ---
graph_builder = StateGraph(State)
graph_builder.add_node("guardrail", guardrail_node)
graph_builder.add_node("agent", agent_node)
graph_builder.add_node("tools", ToolNode(tools))
graph_builder.add_node("news", news_node)

graph_builder.add_edge(START, "guardrail")
graph_builder.add_conditional_edges(
    "guardrail", route_after_guardrail, {"agent": "agent", END: END}
)
graph_builder.add_conditional_edges(
    "agent", should_continue, {"tools": "tools", "news": "news"}
)
graph_builder.add_conditional_edges(
    "tools", route_after_tools, {"agent": "agent", "news": "news"}
)
graph_builder.add_edge("news", END)

graph = graph_builder.compile()
