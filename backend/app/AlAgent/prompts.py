"""All prompt templates used by the LangGraph agent, in one place.

Each template is a LangChain `ChatPromptTemplate` (or `PromptTemplate` for
plain text blocks) so the wording lives here, not inline in graph nodes, and
can be tweaked or A/B tested without touching control flow.

Usage in a node:
    chain = NEWS_QUERY_PROMPT | llm
    result = chain.invoke({"question": question})
"""
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate

# ---------------------------------------------------------------------------
# Agent — system prompt + full conversation (tools are bound to the LLM)
# ---------------------------------------------------------------------------
AGENT_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an intelligent stock market analysis assistant for a generative UI app — "
        "your responses may be rendered as rich components (cards, tables, lists) in the chat. "
        "You help users understand US and Indian market indices and stock performance. "
        "A news digest is appended automatically after your answer — do not call any news tool. "
        "Be concise, cite real numbers when available, and never invent prices, "
        "percentages, or holdings — if you don't have the data, say so. "
        "You provide analysis and education, not financial advice.",
    ),
    MessagesPlaceholder("messages"),
])

# ---------------------------------------------------------------------------
# Guardrail — is the message on-topic?
# ---------------------------------------------------------------------------
GUARDRAIL_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Is this message about stocks, bonds, economy, inflation, "
        "hedge funds / institutional investors, congressional trading, "
        "or a greeting (hi, hello, hey)? Answer only 'yes' or 'no'.",
    ),
    ("human", "{question}"),
])

GUARDRAIL_REJECTION = (
    "I can only help with stock, bond, and economy-related questions. "
    "Could you ask something in those areas?"
)

# ---------------------------------------------------------------------------
# News — turn the user's question into a search query
# ---------------------------------------------------------------------------
NEWS_QUERY_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Convert the user's question into a short Google News search query "
        "(a stock symbol, index, or market topic). Reply with ONLY the query.",
    ),
    ("human", "{question}"),
])

# ---------------------------------------------------------------------------
# News — per-article summaries + overall AI take
# ---------------------------------------------------------------------------
ARTICLE_BLOCK_TEMPLATE = PromptTemplate.from_template(
    "[{index}] Title: {title}\nSource: {publisher}\nContent: {content}"
)

NO_ARTICLES_TEXT = "No recent headlines found."
NO_CONTENT_TEXT = "No full content available — headline only."

# Take formats: the LLM must emit these exact headings so the UI can render them.
GENERAL_TAKE_INSTRUCTIONS = (
    "Then provide your overall take with a Quick Summary and My Take."
)
GENERAL_TAKE_FORMAT = (
    "## Quick Summary\n"
    "<2-4 bullet points of the key developments>\n\n"
    "## My Take\n"
    "<2-3 sentences of analysis>\n\n"
)

STOCK_TAKE_INSTRUCTIONS = (
    "Then, using the FUNDAMENTALS below together with the news, give your "
    "take as an equity analyst answering three questions: the company's moat, "
    "whether the stock is a buy, and how the financials look. Be specific and "
    "cite the numbers; do not hedge every sentence."
)
STOCK_TAKE_FORMAT = (
    "## What is the stock's moat?\n"
    "<2-4 sentences: what durable competitive advantage (brand, network effects, "
    "switching costs, scale/cost, IP, regulation) the business has, how wide it is, "
    "and what could erode it. Use the Business description and margins/ROE as evidence.>\n\n"
    "## Is the stock a buy?\n"
    "<Give a clear lean — Buy / Hold / Avoid — then 3-4 sentences justifying it using "
    "valuation (P/E, PEG, P/S vs growth), 52-week position, analyst consensus and "
    "target upside, and the news. Name the single biggest risk.>\n\n"
    "## How are the financials?\n"
    "<3-4 bullet points covering revenue and earnings trend from the annual data, "
    "margins and returns, balance sheet strength (cash vs debt, current ratio), and "
    "free cash flow. Call out anything deteriorating.>\n\n"
)

NEWS_DIGEST_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are analyzing news articles about: {question}\n\n"
        "For each article, write a concise 1-2 sentence summary capturing "
        "the key point.\n"
        "{take_instructions}\n\n"
        "Format your response EXACTLY as:\n"
        "===SUMMARIES===\n"
        "[1] summary here\n[2] summary here\n...\n"
        "===TAKE===\n"
        "{take_format}"
        "*This is educational commentary, not financial advice.*\n\n"
        "{context_block}"
        "Articles:\n{articles}",
    ),
    ("human", "{question}"),
])

NEWS_DIGEST_GENERAL = NEWS_DIGEST_PROMPT.partial(
    take_instructions=GENERAL_TAKE_INSTRUCTIONS,
    take_format=GENERAL_TAKE_FORMAT,
    context_block="",
)

NEWS_DIGEST_STOCK = NEWS_DIGEST_PROMPT.partial(
    take_instructions=STOCK_TAKE_INSTRUCTIONS,
    take_format=STOCK_TAKE_FORMAT,
)

NEWS_DONE_MESSAGE = (
    "I've pulled the latest headlines, summarized each article, "
    "and added my take in the News Summary card."
)

# ---------------------------------------------------------------------------
# Stock fundamentals block (fed into NEWS_DIGEST_STOCK as `context_block`)
# ---------------------------------------------------------------------------
STOCK_FUNDAMENTALS_TEMPLATE = PromptTemplate.from_template(
    "Fundamentals:\n"
    "Company: {name} ({symbol}) — {sector} / {industry}, {country}\n"
    "Business: {description}\n"
    "Price: {price} ({change_percent} today); 52w {low_52w}–{high_52w} "
    "(at {position_52w} of range); 50d {avg_50d}, 200d {avg_200d}; beta {beta}\n"
    "Valuation: mkt cap {market_cap}, EV {enterprise_value}, P/E {trailing_pe} "
    "(fwd {forward_pe}), PEG {peg_ratio}, P/B {price_to_book}, P/S {price_to_sales}, "
    "div yield {dividend_yield}\n"
    "Growth: revenue {revenue_growth}, earnings {earnings_growth}, "
    "qtrly earnings {earnings_quarterly_growth}\n"
    "Profitability: gross {gross_margin}, operating {operating_margin}, "
    "net {profit_margin}, ROE {return_on_equity}, ROA {return_on_assets}\n"
    "Balance sheet: cash {total_cash}, debt {total_debt}, D/E {debt_to_equity}, "
    "current ratio {current_ratio}, FCF {free_cashflow}, op CF {operating_cashflow}, "
    "short % float {short_percent_of_float}\n"
    "Analysts ({num_analysts}): consensus {consensus} — strong buy {strong_buy}, "
    "buy {buy}, hold {hold}, sell {sell}, strong sell {strong_sell}; "
    "targets low {target_low} / mean {target_mean} / high {target_high} "
    "(upside vs mean {target_upside})\n"
    "Annual financials: {annual_financials}\n\n"
)

ANNUAL_ROW_TEMPLATE = PromptTemplate.from_template(
    "{year}: rev {revenue}, net {net_income}, FCF {free_cashflow}, EPS {eps}"
)
