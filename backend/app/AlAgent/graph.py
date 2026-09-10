"""LangGraph agent: guardrail → agent (LLM + tools) → tools → agent → END

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
                      │  agent   │ ── no tool calls ──→ response ──→ END
                      │ (LLM +   │ ── has tool calls ──┐
                      │  tools)  │                    │
                      └──────────┘                    ▼
                                             ┌──────────┐
                                             │  tools   │
                                             │(execute) │
                                             └────┬─────┘
                                                  │
                                                  ▼
                                            back to agent
"""
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.AlAgent.llm import llm, SYSTEM_PROMPT
from app.AlAgent.tools import greet_user, get_market_overview

# Bind tools to the LLM so it can decide to call them
tools = [greet_user, get_market_overview]
llm_with_tools = llm.bind_tools(tools)


# State: a list of messages that accumulates as nodes run.
# `add_messages` is a reducer — it appends new messages instead of replacing.
class State(TypedDict):
    messages: Annotated[list, add_messages]


# --- Node 1: Guardrail ---
def guardrail_node(state: State) -> dict:
    """Ask the LLM: is this question about stocks/bonds/economy?
    If no, return a polite rejection (and the graph ends).
    If yes, return {} (no changes) and the graph continues to the agent.
    """
    user_msg = state["messages"][-1]
    check = llm.invoke([
        SystemMessage(
            "Is this message about stocks, bonds, economy, or a greeting "
            "(hi, hello, hey)? Answer only 'yes' or 'no'."
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
    - call a tool (greet_user / get_market_overview)
    """
    messages = [SYSTEM_PROMPT] + state["messages"]
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}


def should_continue(state: State) -> str:
    """After the agent responds:
    - if it called tools → go to tools node
    - if it didn't → END
    """
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


# --- Node 3: Tools ---
# ToolNode is a prebuilt node that executes whatever tools the agent called,
# then returns ToolMessages with the results.

# --- Build the graph ---
graph_builder = StateGraph(State)
graph_builder.add_node("guardrail", guardrail_node)
graph_builder.add_node("agent", agent_node)
graph_builder.add_node("tools", ToolNode(tools))

graph_builder.add_edge(START, "guardrail")
graph_builder.add_conditional_edges(
    "guardrail", route_after_guardrail, {"agent": "agent", END: END}
)
graph_builder.add_conditional_edges(
    "agent", should_continue, {"tools": "tools", END: END}
)
graph_builder.add_edge("tools", "agent")  # after tools, back to agent

graph = graph_builder.compile()
