"""LangGraph agent: guardrail → agent (LLM + tools) → tools → (agent | news) → synthesize → END

Flow:
  User message
      │
      ▼
  ┌──────────┐
  │ guardrail │ ── off_topic ──→ rejection message ──→ END
  │ (label,   │ ── on_topic / ambiguous ──┐
  │ last 3    │                           │
  │ messages) │                           │
  └──────────┘                            │
                                          ▼
                                  ┌──────────┐
                                  │  agent   │ ── no tool calls ──→ news relevant? ── no ──→ END
                                  │ (LLM +   │ ── has tool calls ──┐             │ yes
                                  │  tools)  │                    │             │
                                  └──────────┘                    ▼             │
                                                         ┌──────────┐           │
                                                         │  tools   │           │
                                                         │(execute) │           │
                                                         └────┬─────┘           │
                                                text result │   │ component     │
                                                            ▼   │ result        │
                                                          agent │               │
                                                                ▼               ▼
                                                        ┌──────────────┐
                                                        │  news node   │
                                                        │ LLM picks    │
                                                        │ query → fetch│
                                                        │ → summarize  │
                                                        └──────┬───────┘
                                                               ▼
                                                      ┌────────────────┐
                                                      │  synthesize    │
                                                      │ per tool: DATA │
                                                      │ + news → take  │
                                                      └───────┬────────┘
                                                              ▼
                                                             END
"""
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.AlAgent.context import CONTEXT_BUILDERS
from app.AlAgent.llm import llm
from app.AlAgent.prompts import (
    AGENT_PROMPT,
    ARTICLE_BLOCK_TEMPLATE,
    GUARDRAIL_PROMPT,
    GUARDRAIL_REJECTION,
    NEWS_DIGEST_GENERAL,
    NEWS_DONE_MESSAGE,
    NEWS_QUERY_PROMPT,
    NEWS_RELEVANCE_PROMPT,
    NO_ARTICLES_TEXT,
    NO_CONTENT_TEXT,
    NO_NEWS_TEXT,
    SYNTHESIS_PROMPT,
    TAKE_FORMATS,
)
from app.AlAgent.tools import (
    bond_market_overview,
    cpi_report,
    crypto_market_overview,
    greet_user,
    smart_money,
    stock_analysis_by_symbol,
    stock_market_overview,
    trending_stocks,
    upcoming_economic_events,
)
from app.core.cache import get_raw, set_raw
from app.services.stock_detail import AI_NEWS_COUNT, fetch_article_content, get_news_for_query

# Bind tools to the LLM so it can decide to call them
tools = [
    greet_user,
    stock_market_overview,
    trending_stocks,
    crypto_market_overview,
    bond_market_overview,
    cpi_report,
    upcoming_economic_events,
    smart_money,
    stock_analysis_by_symbol,
]
llm_with_tools = llm.bind_tools(tools)


# State: a list of messages that accumulates as nodes run, plus the latest
# fetched news items (written by the news node, read by the API for the UI card),
# the AI's news-only take (rendered in the News Summary card), and one
# synthesized data+news take per tool called this turn (written by synthesize).
class State(TypedDict):
    messages: Annotated[list, add_messages]
    news_items: list
    ai_take: str
    tool_takes: list


def _latest_question(state: State) -> str:
    """The user's current question = the most recent HumanMessage."""
    return next(
        (m.content for m in reversed(state["messages"]) if isinstance(m, HumanMessage)), ""
    )


def _tool_results_this_turn(state: State) -> dict[str, dict]:
    """Component results from every ToolMessage after the latest HumanMessage,
    keyed by component name (latest wins). Errored results are skipped."""
    results: dict[str, dict] = {}
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            break
        if not isinstance(msg, ToolMessage) or not isinstance(msg.content, str):
            continue
        try:
            result = json.loads(msg.content)
        except json.JSONDecodeError:
            continue
        if not isinstance(result, dict) or "component" not in result:
            continue
        props = result.get("props") or {}
        if props.get("error") or result["component"] in results:
            continue
        results[result["component"]] = props
    return results


# --- Node 1: Guardrail ---
GUARDRAIL_CONTEXT_MESSAGES = 3  # latest human message + up to 2 prior turns


def guardrail_node(state: State) -> dict:
    """Ask the LLM to label the latest message: on_topic | ambiguous | off_topic.
    Only a clear off_topic label rejects (ambiguous passes through — the agent
    prompt's refusal rule is the second line of defense). The last few
    messages are included so follow-ups like "and yesterday?" are classified
    with context rather than in isolation.
    """
    recent = [
        m for m in state["messages"][-GUARDRAIL_CONTEXT_MESSAGES:]
        if isinstance(m, (HumanMessage, AIMessage)) and isinstance(m.content, str) and m.content
    ]
    check = (GUARDRAIL_PROMPT | llm).invoke({"messages": recent})
    label = check.content.strip().lower()
    if label.startswith("off_topic") or "off_topic" in label:
        return {"messages": [AIMessage(GUARDRAIL_REJECTION)]}
    return {}  # on_topic / ambiguous / unparseable: pass through unchanged


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


def _news_is_relevant(state: State) -> bool:
    """Ask the LLM whether a headline digest adds value to this answer.
    Definitional / educational questions and greetings skip the news node.
    Fails open (fetch news) if the reply is unparseable."""
    question = _latest_question(state)
    verdict = (NEWS_RELEVANCE_PROMPT | llm).invoke({"question": question}).content
    return not verdict.strip().lower().startswith("no")


def should_continue(state: State) -> str:
    """After the agent responds:
    - if it called tools → go to tools node
    - if it answered directly → news node only when news adds value, else END
    """
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return "news" if _news_is_relevant(state) else END


# --- Node 3: Tools ---
# ToolNode is a prebuilt node that executes whatever tools the agent called,
# then returns ToolMessages with the results.

def route_after_tools(state: State) -> str:
    """After tools run, look at the batch of new ToolMessages (in reverse):
    - any plain text result (e.g. greet_user) → back to agent to phrase it
    - all UI components → go to the news node (components already streamed);
      the synthesize node writes the data+news take afterwards
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


def news_node(state: State) -> dict:
    """Deterministic news step — cannot be skipped:
    1. LLM turns the user's question into a search query
    2. Fetch latest headlines from Google News
    3. Fetch full article content (best-effort, parallel)
    4. Single LLM call: per-article summaries + a news-only take
    5. Return news items (with ai_summary) + news-only ai_take
    The synthesize node then owns the News Summary card: it replaces ai_take
    with the data-aware per-tool takes when any component tool ran.
    """
    question = _latest_question(state)

    # Step 1: LLM picks the search query
    query = (NEWS_QUERY_PROMPT | llm).invoke({"question": question}).content.strip()

    # Step 2: fetch news
    feed = get_news_for_query(query, count=AI_NEWS_COUNT)
    items = feed.items

    # Check cache for AI summaries + take (keyed by query, same TTL as news).
    cache_key = f"news_ai:{query}"
    cached = get_raw(cache_key, 600)
    if cached:
        return {"news_items": cached["items"], "ai_take": cached["ai_take"]}

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

    try:
        response = (NEWS_DIGEST_GENERAL | llm).invoke(
            {"question": question, "articles": articles_text}
        )
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

    return {"news_items": news_items_dump, "ai_take": take}


# --- Node 5: Synthesize (one data+news take per tool called this turn) ---
def _news_block(state: State) -> str:
    lines = [
        f"- {item.get('title')}: {item.get('ai_summary') or '(headline only)'}"
        for item in state.get("news_items") or []
    ]
    return "\n".join(lines) or NO_NEWS_TEXT


def synthesize_node(state: State) -> dict:
    """For each component tool that ran this turn, make one LLM call that
    combines the tool's DATA (via its context builder) with the news digest
    and writes a final take in that tool's format. Everything lands in the
    News Summary card: `ai_take` becomes the joined per-tool takes, or stays
    the news-only take when no component tool ran. The API emits the card
    from this node's update, followed by a short confirmation in the chat.
    """
    question = _latest_question(state)
    news_block = _news_block(state)
    takes: list[dict] = []

    for name, props in _tool_results_this_turn(state).items():
        builder = CONTEXT_BUILDERS.get(name)
        take_format = TAKE_FORMATS.get(name)
        if not builder or not take_format:
            continue
        try:
            context_block = builder(props)
        except Exception:
            continue

        digest = hashlib.sha1(f"{question}|{context_block}|{news_block}".encode()).hexdigest()
        cache_key = f"take:{name}:{digest}"
        cached = get_raw(cache_key, 600)
        if cached:
            takes.append(cached)
            continue

        try:
            take = (SYNTHESIS_PROMPT | llm).invoke({
                "question": question,
                "tool_name": name,
                "take_format": take_format,
                "context_block": context_block,
                "news_block": news_block,
            }).content.strip()
        except Exception:
            continue
        entry = {"tool": name, "take": take}
        set_raw(cache_key, entry)
        takes.append(entry)

    ai_take = "\n\n".join(t["take"] for t in takes) if takes else (state.get("ai_take") or "")
    return {
        "messages": [AIMessage(NEWS_DONE_MESSAGE)],
        "news_items": state.get("news_items") or [],
        "ai_take": ai_take,
        "tool_takes": takes,
    }


# --- Build the graph ---
graph_builder = StateGraph(State)
graph_builder.add_node("guardrail", guardrail_node)
graph_builder.add_node("agent", agent_node)
graph_builder.add_node("tools", ToolNode(tools))
graph_builder.add_node("news", news_node)
graph_builder.add_node("synthesize", synthesize_node)

graph_builder.add_edge(START, "guardrail")
graph_builder.add_conditional_edges(
    "guardrail", route_after_guardrail, {"agent": "agent", END: END}
)
graph_builder.add_conditional_edges(
    "agent", should_continue, {"tools": "tools", "news": "news", END: END}
)
graph_builder.add_conditional_edges(
    "tools", route_after_tools, {"agent": "agent", "news": "news"}
)
graph_builder.add_edge("news", "synthesize")
graph_builder.add_edge("synthesize", END)

graph = graph_builder.compile()
