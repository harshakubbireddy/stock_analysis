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
        "You help users understand US and Indian market indices, stock performance, "
        "market sentiment, trending stocks, and crypto prices. "
        "A news digest may be appended automatically after your answer — do not call any news tool. "
        "Be concise, cite real numbers when available, and never invent prices, "
        "percentages, or holdings — if you don't have the data, say so. "
        "Stay strictly within markets, investing, and the economy: if any part of a "
        "request is unrelated (coding, poems, weather, general trivia, personal tasks), "
        "decline that part in one short sentence and answer only the finance-related part. "
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
        "You classify whether the user's latest message belongs in a stock market "
        "assistant. Use the earlier messages only as context for follow-ups "
        "(e.g. 'and yesterday?', 'what about Tesla?').\n"
        "Labels:\n"
        "- on_topic: stocks, bonds, crypto, economy, inflation, market sentiment, "
        "trending stocks / top movers, hedge funds / institutional investors, "
        "congressional trading, investing concepts, or a greeting (hi, hello, hey).\n"
        "- ambiguous: finance-adjacent or unclear (commodities, real estate, forex, "
        "personal finance, company or political news without a market angle).\n"
        "- off_topic: clearly unrelated (coding, weather, recipes, poems, trivia).\n"
        "Reply with exactly one label: on_topic, ambiguous, or off_topic.",
    ),
    MessagesPlaceholder("messages"),
])

GUARDRAIL_REJECTION = (
    "I can only help with stock, bond, and economy-related questions. "
    "Could you ask something in those areas?"
)

# ---------------------------------------------------------------------------
# News — does a headline digest add value to this answer?
# ---------------------------------------------------------------------------
NEWS_RELEVANCE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Decide whether fetching today's news headlines would add value to the "
        "assistant's answer.\n"
        "- yes: the question is about current events, prices, performance, a "
        "specific company, sector, asset, or 'what is happening' now.\n"
        "- no: the question is definitional or educational (what is a P/E ratio, "
        "how do bonds work), a greeting, or small talk.\n"
        "Reply with exactly one word: yes or no.",
    ),
    ("human", "{question}"),
])

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

# Used by TAKE_FORMATS["stock_analysis_by_symbol"] in the synthesize node.
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
        "Articles:\n{articles}",
    ),
    ("human", "{question}"),
])

NEWS_DIGEST_GENERAL = NEWS_DIGEST_PROMPT.partial(
    take_instructions=GENERAL_TAKE_INSTRUCTIONS,
    take_format=GENERAL_TAKE_FORMAT,
)

NEWS_DONE_MESSAGE = (
    "I've pulled the latest headlines, summarized each article, "
    "and added my take in the News Summary card."
)

# ---------------------------------------------------------------------------
# Stock fundamentals block (rendered by context.stock_analysis_context and
# fed into SYNTHESIS_PROMPT as `context_block`)
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

# ---------------------------------------------------------------------------
# Synthesis — one final take per tool, combining the tool's DATA + the news
# digest. `TAKE_FORMATS` is keyed by tool/component name; the middle section
# is tool-specific, the outer skeleton is shared.
# ---------------------------------------------------------------------------
_NEWS_AND_TAKE = (
    "## What the news says\n"
    "<2-3 bullets from the NEWS that are relevant to the question>\n\n"
    "## My Take\n"
    "<2-3 sentences connecting DATA and NEWS: does the news explain the numbers, "
    "is anything contradictory, what to watch next>\n\n"
)

TAKE_FORMATS = {
    "stock_market_overview": (
        "## Quick Summary\n<2-4 bullets with the key index moves and sentiment readings>\n\n"
        "## Market Read\n"
        "- US: <S&P 500, Nasdaq, Dow % moves> → <risk-on / risk-off / mixed>\n"
        "- India: <Nifty, Sensex % moves>\n"
        "- Sectors: leading <top 2>, lagging <bottom 2>\n"
        "- Sentiment: VIX <value (rating)>, CNN Fear & Greed <value (rating)>\n\n"
    ) + _NEWS_AND_TAKE,
    "trending_stocks": (
        "## Quick Summary\n<2-4 bullets: the standout gainers, losers, and volume names>\n\n"
        "## Movers\n"
        "- Top gainers: <3 symbols with % moves>\n"
        "- Top losers: <3 symbols with % moves>\n"
        "- Most active: <2-3 symbols with volume>\n"
        "- Theme: <common sector or catalyst among the movers, if any>\n\n"
    ) + _NEWS_AND_TAKE,
    "crypto_market_overview": (
        "## Quick Summary\n<2-4 bullets: BTC/ETH moves and sentiment>\n\n"
        "## Crypto Read\n"
        "- Prices: <BTC, ETH and 1-2 others with % moves>\n"
        "- Breadth: <n of total coins up>\n"
        "- Crypto Fear & Greed: <value (rating)> — <is sentiment extreme vs price action?>\n\n"
    ) + _NEWS_AND_TAKE,
    "bond_market_overview": (
        "## Quick Summary\n<2-4 bullets: the key yield moves and curve shape>\n\n"
        "## Yield Curve\n"
        "- 3M / 2Y / 10Y / 30Y: <yields with today's bps change>\n"
        "- Shape: <curve_shape>, 3M-10Y spread <bps>\n"
        "- vs. a month ago: <10Y direction>\n"
        "- ETFs: <TLT, HYG, TIP % moves>\n\n"
    ) + _NEWS_AND_TAKE,
    "cpi_report": (
        "## Quick Summary\n<2-4 bullets: headline and core prints vs. trend>\n\n"
        "## Inflation Snapshot\n"
        "- Headline CPI: <YoY, MoM>\n"
        "- Core CPI: <YoY>\n"
        "- Trend: <cooling / sticky / re-accelerating, with the prior-month comparison>\n"
        "- Rate implication: <what this means for Fed expectations>\n\n"
    ) + _NEWS_AND_TAKE,
    "upcoming_economic_events": (
        "## Quick Summary\n<2-4 bullets: the events most likely to move markets>\n\n"
        "## This Week's Calendar\n"
        "- <date>: <title> [<impact>] — forecast <x>, prior <y>\n"
        "- <... high-impact first, max 5 lines>\n\n"
    ) + _NEWS_AND_TAKE,
    "smart_money": (
        "## Quick Summary\n<2-4 bullets: overall stance and the strongest signals>\n\n"
        "## Institutional Flow\n"
        "- Stance: <institution_stance>\n"
        "- High-conviction: <issuers bought/sold by multiple funds>\n"
        "- Per fund: <2-3 notable funds with stance and counts>\n"
        "- Congress: <buys / sells, net $M, top buy, top sell>\n"
        "- Agreement: <do funds and politicians point the same way?>\n\n"
    ) + _NEWS_AND_TAKE,
    "stock_analysis_by_symbol": (
        "## Quick Summary\n<2-4 bullets: price action, valuation, analyst view>\n\n"
        + STOCK_TAKE_FORMAT
        + "## What the news says\n"
        "<2-3 bullets from the NEWS that are relevant to this company>\n\n"
    ),
}

SYNTHESIS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an equity and macro analyst answering the user's question: {question}\n\n"
        "Use ONLY the DATA and NEWS below. Cite the actual numbers. Never invent "
        "prices, percentages, or holdings — write n/a if a value is missing. "
        "Be specific and do not hedge every sentence.\n\n"
        "Format your response EXACTLY as:\n"
        "{take_format}"
        "*This is educational commentary, not financial advice.*\n\n"
        "DATA ({tool_name}):\n{context_block}\n\n"
        "NEWS:\n{news_block}",
    ),
    ("human", "{question}"),
])

NO_NEWS_TEXT = "No recent headlines were available."
