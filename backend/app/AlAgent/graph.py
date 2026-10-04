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
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.AlAgent.llm import llm
from app.AlAgent.prompts import (
    AGENT_PROMPT,
    ANNUAL_ROW_TEMPLATE,
    ARTICLE_BLOCK_TEMPLATE,
    GUARDRAIL_PROMPT,
    GUARDRAIL_REJECTION,
    NEWS_DIGEST_GENERAL,
    NEWS_DIGEST_STOCK,
    NEWS_DONE_MESSAGE,
    NEWS_QUERY_PROMPT,
    NO_ARTICLES_TEXT,
    NO_CONTENT_TEXT,
    STOCK_FUNDAMENTALS_TEMPLATE,
)
from app.AlAgent.tools import (
    bond_market_overview,
    cpi_report,
    greet_user,
    smart_money,
    stock_analysis_by_symbol,
    stock_market_overview,
    upcoming_economic_events,
)
from app.core.cache import get_raw, set_raw
from app.services.stock_detail import AI_NEWS_COUNT, fetch_article_content, get_news_for_query

# Bind tools to the LLM so it can decide to call them
tools = [
    greet_user,
    stock_market_overview,
    bond_market_overview,
    cpi_report,
    upcoming_economic_events,
    smart_money,
    stock_analysis_by_symbol,
]
llm_with_tools = llm.bind_tools(tools)


# State: a list of messages that accumulates as nodes run, plus the latest
# fetched news items (written by the news node, read by the API for the UI card)
# and the AI's overall take (also rendered in the News Summary card).
class State(TypedDict):
    messages: Annotated[list, add_messages]
    news_items: list
    ai_take: str


# --- Node 1: Guardrail ---
def guardrail_node(state: State) -> dict:
    """Ask the LLM: is this question about stocks/bonds/economy?
    If no, return a polite rejection (and the graph ends).
    If yes, return {} (no changes) and the graph continues to the agent.
    """
    user_msg = state["messages"][-1]
    check = (GUARDRAIL_PROMPT | llm).invoke({"question": user_msg.content})
    if check.content.strip().lower() == "no":
        return {"messages": [AIMessage(GUARDRAIL_REJECTION)]}
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
    response = (AGENT_PROMPT | llm_with_tools).invoke({"messages": state["messages"]})
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
def _parse_ai_news_response(text: str, count: int) -> tuple[list[str], str]:
    """Parse the LLM's structured response into per-article summaries + take.

    Expected format::

        ===SUMMARIES===
        [1] summary one
        [2] summary two
        ===TAKE===
        ## Quick Summary
        ...
        ## My Take
        ...

    Falls back gracefully (empty summaries / empty take) if the LLM
    doesn't follow the format exactly.
    """
    summaries = [""] * count
    take = ""

    take_split = text.split("===TAKE===", 1)
    summaries_section = take_split[0]
    if len(take_split) == 2:
        take = take_split[1].strip()

    if "===SUMMARIES===" in summaries_section:
        summaries_section = summaries_section.split("===SUMMARIES===", 1)[1]

    for line in summaries_section.strip().splitlines():
        line = line.strip()
        if not line.startswith("[") or "]" not in line:
            continue
        close = line.index("]")
        try:
            idx = int(line[1:close]) - 1
        except ValueError:
            continue
        if 0 <= idx < count:
            summaries[idx] = line[close + 1:].strip()

    return summaries, take


def _fmt(v, suffix: str = "", digits: int = 2) -> str:
    if v is None:
        return "n/a"
    if isinstance(v, (int, float)):
        a = abs(v)
        if a >= 1e12:
            return f"{v / 1e12:.2f}T{suffix}"
        if a >= 1e9:
            return f"{v / 1e9:.1f}B{suffix}"
        if a >= 1e6:
            return f"{v / 1e6:.0f}M{suffix}"
        return f"{v:.{digits}f}{suffix}"
    return f"{v}{suffix}"


def _ratio_pct(v) -> str:
    return _fmt(v * 100, "%", 1) if isinstance(v, (int, float)) else "n/a"


def _stock_analysis_context(state: State) -> tuple[str, str] | None:
    """If the agent ran stock_analysis_by_symbol this turn, return
    (symbol, compact fundamentals text) for the LLM's take. Else None."""
    for msg in reversed(state["messages"]):
        if not isinstance(msg, ToolMessage) or not isinstance(msg.content, str):
            continue
        if '"stock_analysis_by_symbol"' not in msg.content:
            continue
        try:
            p = json.loads(msg.content).get("props", {})
        except (json.JSONDecodeError, AttributeError):
            continue
        if not p or p.get("error"):
            continue

        t = p.get("analyst_targets") or {}
        r = p.get("recommendations") or {}
        fin = (p.get("financials") or {}).get("annual") or []
        annual = "; ".join(
            ANNUAL_ROW_TEMPLATE.format(
                year=(row.get("period") or "?")[:4],
                revenue=_fmt(row.get("revenue")),
                net_income=_fmt(row.get("net_income")),
                free_cashflow=_fmt(row.get("free_cashflow")),
                eps=_fmt(row.get("eps")),
            )
            for row in fin[:5]
        ) or "n/a"

        text = STOCK_FUNDAMENTALS_TEMPLATE.format(
            name=p.get("name"),
            symbol=p.get("symbol"),
            sector=p.get("sector") or "n/a",
            industry=p.get("industry") or "n/a",
            country=p.get("country") or "n/a",
            description=(p.get("description") or "")[:600] or "n/a",
            price=_fmt(p.get("price")),
            change_percent=_fmt(p.get("change_percent"), "%"),
            low_52w=_fmt(p.get("fifty_two_week_low")),
            high_52w=_fmt(p.get("fifty_two_week_high")),
            position_52w=_fmt(p.get("fifty_two_week_position_pct"), "%", 0),
            avg_50d=_fmt(p.get("fifty_day_avg")),
            avg_200d=_fmt(p.get("two_hundred_day_avg")),
            beta=_fmt(p.get("beta")),
            market_cap=_fmt(p.get("market_cap")),
            enterprise_value=_fmt(p.get("enterprise_value")),
            trailing_pe=_fmt(p.get("trailing_pe")),
            forward_pe=_fmt(p.get("forward_pe")),
            peg_ratio=_fmt(p.get("peg_ratio")),
            price_to_book=_fmt(p.get("price_to_book")),
            price_to_sales=_fmt(p.get("price_to_sales")),
            dividend_yield=_fmt(p.get("dividend_yield"), "%"),
            revenue_growth=_ratio_pct(p.get("revenue_growth")),
            earnings_growth=_ratio_pct(p.get("earnings_growth")),
            earnings_quarterly_growth=_ratio_pct(p.get("earnings_quarterly_growth")),
            gross_margin=_ratio_pct(p.get("gross_margin")),
            operating_margin=_ratio_pct(p.get("operating_margin")),
            profit_margin=_ratio_pct(p.get("profit_margin")),
            return_on_equity=_ratio_pct(p.get("return_on_equity")),
            return_on_assets=_ratio_pct(p.get("return_on_assets")),
            total_cash=_fmt(p.get("total_cash")),
            total_debt=_fmt(p.get("total_debt")),
            debt_to_equity=_fmt(p.get("debt_to_equity")),
            current_ratio=_fmt(p.get("current_ratio")),
            free_cashflow=_fmt(p.get("free_cashflow")),
            operating_cashflow=_fmt(p.get("operating_cashflow")),
            short_percent_of_float=_ratio_pct(p.get("short_percent_of_float")),
            num_analysts=r.get("num_analysts", 0),
            consensus=r.get("consensus", "n/a"),
            strong_buy=r.get("strong_buy", 0),
            buy=r.get("buy", 0),
            hold=r.get("hold", 0),
            sell=r.get("sell", 0),
            strong_sell=r.get("strong_sell", 0),
            target_low=_fmt(t.get("low")),
            target_mean=_fmt(t.get("mean")),
            target_high=_fmt(t.get("high")),
            target_upside=_fmt(t.get("upside_pct"), "%", 1),
            annual_financials=annual,
        )
        return str(p.get("symbol", "")), text
    return None


def news_node(state: State) -> dict:
    """Deterministic news step — cannot be skipped:
    1. LLM turns the user's question into a search query
    2. Fetch latest headlines from Google News
    3. Fetch full article content (best-effort, parallel)
    4. Single LLM call: per-article summaries + overall AI take
       (if a stock analysis ran this turn, the take also uses its fundamentals
       and answers: moat? buy? financials?)
    5. Return news items (with ai_summary) + ai_take for the UI card
    """
    # The user's question is the first human message.
    question = next(
        (m.content for m in state["messages"] if isinstance(m, HumanMessage)), ""
    )
    stock_ctx = _stock_analysis_context(state)

    # Step 1: LLM picks the search query
    query = (NEWS_QUERY_PROMPT | llm).invoke({"question": question}).content.strip()

    # Step 2: fetch news
    feed = get_news_for_query(query, count=AI_NEWS_COUNT)
    items = feed.items

    # Check cache for AI summaries + take (keyed by query, same TTL as news).
    # Stock-analysis takes are keyed separately so a generic news take for the
    # same query is never reused for the moat/buy/financials format.
    cache_key = f"news_ai:stock:{stock_ctx[0]}:{query}" if stock_ctx else f"news_ai:{query}"
    cached = get_raw(cache_key, 600)
    if cached:
        return {
            "messages": [AIMessage(NEWS_DONE_MESSAGE)],
            "news_items": cached["items"],
            "ai_take": cached["ai_take"],
        }

    # Step 3: fetch full article content in parallel (best-effort)
    urls = [item.url for item in items]
    with ThreadPoolExecutor(max_workers=AI_NEWS_COUNT) as executor:
        contents = list(executor.map(
            lambda url: fetch_article_content(url) if url else None, urls
        ))

    # Step 4: single LLM call for per-article summaries + overall take
    articles_text = "\n\n".join(
        ARTICLE_BLOCK_TEMPLATE.format(
            index=i + 1,
            title=item.title,
            publisher=item.publisher or "Unknown",
            content=contents[i] or NO_CONTENT_TEXT,
        )
        for i, item in enumerate(items)
    ) or NO_ARTICLES_TEXT

    # Pick the digest variant: stock take (moat / buy / financials) when a
    # stock analysis ran this turn, otherwise the general quick-summary take.
    if stock_ctx:
        chain = NEWS_DIGEST_STOCK | llm
        inputs = {"question": question, "articles": articles_text, "context_block": stock_ctx[1]}
    else:
        chain = NEWS_DIGEST_GENERAL | llm
        inputs = {"question": question, "articles": articles_text}

    try:
        response = chain.invoke(inputs)
        summaries, take = _parse_ai_news_response(response.content, len(items))
    except Exception:
        summaries = [""] * len(items)
        take = ""

    # Attach per-article summaries to the news items
    for i, item in enumerate(items):
        if i < len(summaries) and summaries[i]:
            item.ai_summary = summaries[i]

    news_items_dump = [item.model_dump() for item in items]

    # Cache the AI-summarized result
    set_raw(cache_key, {"items": news_items_dump, "ai_take": take})

    return {
        "messages": [AIMessage(NEWS_DONE_MESSAGE)],
        "news_items": news_items_dump,
        "ai_take": take,
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
