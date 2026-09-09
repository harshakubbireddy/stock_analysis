# Plan — AI Stock Analysis Agent

Build a **Generative UI** AI chat agent on the `/ai-analysis` page that answers natural-language questions from the **Market Analysis**, **Stock Analysis**, and **Smart Money** categories by calling the existing backend services as tools — and rendering each tool result as a **real existing dashboard component** inline in the conversation. The LLM is **pluggable**: local Ollama or a hosted OpenAI-compatible API, selected via config.

> Per `Mentor-mode.md`, this is a **design + step-by-step plan only**. The user implements each step themselves. The original question list is preserved in the [Appendix](#appendix-original-question-list).

---

## Current State

### Backend (FastAPI — `backend/app/`)
Working data services, no LLM yet. Routers registered in `main.py`: `congress`, `market`, `thirteenf`.

| Endpoint | Service function | Data source |
|---|---|---|
| `GET /api/market/overview` | `market_data.get_market_overview` | yfinance (US/India indices, crypto, US sector ETFs) |
| `GET /api/market/sentiment` | `sentiment.get_sentiment_overview` | yfinance (`^VIX`) |
| `GET /api/market/sentiment/cnn-fng` | `sentiment.get_cnn_fng_detail` | `fear-greed` pkg (CNN) |
| `GET /api/market/sentiment/crypto-fng` | `sentiment.get_crypto_fng_detail` | alternative.me API |
| `GET /api/market/trending` | `trending.get_trending` | yfinance `screen` (active/gainers/losers) |
| `GET /api/market/stock/{symbol}` | `stock_detail.get_stock_detail` | yfinance (price, PE, 52w, intraday 5m) |
| `GET /api/market/news?symbols=` | `stock_detail.get_news_feed` | yfinance news → Google News RSS fallback |
| `GET /api/market/news/more?symbols=` | `stock_detail.get_google_news_feed` | Google News RSS |
| `GET /api/congress/traders` | `congress.get_traders` | hardcoded list |
| `GET /api/congress/trades?name=` | `congress.get_trades` | House Clerk PDFs (`pdfplumber`) |
| `GET /api/thirteenf/funds` | `thirteenf.get_funds` | hardcoded list |
| `GET /api/thirteenf/holdings/{cik}` | `thirteenf.get_latest_holdings` | SEC EDGAR 13F-HR XML |
| `GET /api/thirteenf/transactions/{cik}` | `thirteenf.get_latest_transactions` | SEC EDGAR (diff of two latest filings) |

### Frontend (Next.js 16 — `frontend/src/`)
Pages: `/` (Overview), `/trending`, `/smart-money`, `/ai-analysis`. Real dashboards wired via hooks. **`/ai-analysis` is a static mockup** — hardcoded chat bubbles, no state, no API call.

### Not yet present
- `backend/app/agents/` folder — does not exist.
- LangChain / LangGraph / Ollama / OpenAI — not in `requirements.txt`.
- Any `/api/agent/*` endpoint.
- Any real chat wiring on `/ai-analysis`.

---

## AI Agent Design

### Goal
A **Generative UI** chat agent on `/ai-analysis` that answers questions from the **Market Analysis**, **Stock Analysis**, and **Smart Money** categories. Instead of returning plain text, the agent calls the existing backend services as tools and the frontend **renders each tool result as a real existing component** (MarketSnapshotStrip, StockDetailPanel, CongressTradesPanel, etc.) inline in the conversation — interleaved with the assistant's text. Pluggable LLM: local Ollama or hosted OpenAI-compatible API.

### Architecture
```
Frontend (/ai-analysis — Generative UI chat)
   useAgentChat hook ──► POST /api/agent/chat { session_id, message }
        │
        │  Response = ordered list of "parts":
        │    { type: "text",       content: "..." }
        │    { type: "tool_result", tool: "stock_detail", data: {...} }
        │    { type: "tool_result", tool: "congress_trades", data: {...} }
        │
        │  PartRenderer maps each tool_result → existing React component:
        │    stock_detail      → StockDetailPanel + QuoteCard
        │    congress_trades   → CongressTradesPanel
        │    market_overview   → MarketSnapshotStrip + SectorHeatmap
        │    ... (see Tool → Component map below)
        ▼
Backend  app/api/agent.py  ──►  app/agents/  (LangGraph workflow)
        │                              │
        │                              ├─ LLM provider (pluggable)
        │                              │     ├─ OllamaProvider  (ChatOllama, local)
        │                              │     └─ HostedProvider  (OpenAI-compatible)
        │                              │
        │                              ├─ Tools (wrap existing services — no new data logic)
        │                              │     ├─ market_overview
        │                              │     ├─ sentiment_overview / cnn_fng / crypto_fng
        │                              │     ├─ trending
        │                              │     ├─ stock_detail(symbol)
        │                              │     ├─ news_feed(symbols)
        │                              │     ├─ congress_traders / congress_trades(name)
        │                              │     └─ thirteenf_funds / holdings(cik) / transactions(cik)
        │                              │
        │                              ├─ Parts assembler (text + tool results → ordered parts)
        │                              └─ Memory (per session_id, in-memory or simple store)
        ▼
Existing services (unchanged) ──► yfinance / SEC EDGAR / House Clerk / RSS
```

### Generative UI approach
The response is **not** a single text string. It's an ordered list of "parts" that the frontend renders sequentially inside the assistant's message bubble:

- **`text` part** → rendered as markdown/text (the assistant's commentary, summaries, insights).
- **`tool_result` part** → rendered as the **existing component** that matches the tool, fed with the tool's raw data.

This reuses every dashboard component already built — no new visual components needed for V1. The chat becomes a rich, mixed stream: "Here's how NVDA is doing 👇" + a real `StockDetailPanel` + "And here's the latest news:" + a real `NewsFeed`.

**Why this works well here:** the components already exist and already render this exact data on the other pages. Generative UI just routes the same data into them inside the conversation.

### Tool → Component map (V1)
| Tool | Frontend component(s) rendered | Existing? |
|---|---|---|
| `market_overview` | `MarketSnapshotStrip` (×3: usa/india/crypto) + `SectorHeatmap` | Yes |
| `sentiment_overview` | `SentimentCards` | Yes |
| `cnn_fng` | `FearGreedGauge` | Yes |
| `crypto_fng` | `FearGreedGauge` | Yes |
| `trending` | `TrendingDashboard` (or a compact trending list) | Yes |
| `stock_detail` | `QuoteCard` + `StockDetailPanel` (intraday chart) | Yes |
| `news_feed` | `NewsFeed` | Yes |
| `congress_traders` | simple list (small) | New (trivial) |
| `congress_trades` | `CongressTradesPanel` | Yes |
| `thirteenf_funds` | simple list (small) | New (trivial) |
| `thirteenf_holdings` | `ThirteenFDashboard` (holdings view) | Yes |
| `thirteenf_transactions` | `ThirteenFDashboard` (transactions view) | Yes |

### Why LangGraph
- Matches the original README intent.
- Graph-based agent loop (LLM → tool node → back to LLM) is clean and debuggable.
- Good support for tool-calling and conditional edges.
- Alternative (hand-rolled loop) works but reinvents the wheel; LangGraph is the better learning path.

### Pluggable LLM layer
- A small `LLMProvider` interface (e.g. `chat(messages, tools) -> response`).
- `OllamaProvider` — uses `langchain_ollama.ChatOllama` (local, free, private; needs `ollama pull <model>`).
- `HostedProvider` — uses `langchain_openai.ChatOpenAI` against any OpenAI-compatible endpoint (OpenAI, Groq, Together, local LM Studio, etc.).
- New config vars in `core/config.py`: `LLM_PROVIDER` (`ollama` | `hosted`), `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY` (optional for local).
- A factory selects the provider from config.

### Tool → question mapping (V1 scope)
| Question category | Tools used |
|---|---|
| Market: how is the market doing / indices / sectors | `market_overview` |
| Market: top gainers / losers | `trending` |
| Market: sentiment / Fear & Greed / VIX | `sentiment_overview`, `cnn_fng`, `crypto_fng` |
| Stock: how is X performing / fundamentals / technicals | `stock_detail(symbol)` |
| Stock: news / events | `news_feed(symbols)` |
| Smart Money: what is Congress buying | `congress_traders`, `congress_trades(name)` |
| Smart Money: what are funds holding / buying / selling | `thirteenf_funds`, `holdings(cik)`, `transactions(cik)` |

### System prompt strategy
- Tell the LLM it's a stock-analysis assistant with access to specific tools.
- List each tool with when to use it.
- Instruct it to call tools for real data (never hallucinate prices/holdings), then synthesize a concise answer citing the numbers.
- Map free-text questions to tools (e.g., "how is NVDA doing" → `stock_detail("NVDA")`).

### Frontend changes (planned — Generative UI)
- `/ai-analysis` becomes a real client component with message state, input handler, and `POST` to `/api/agent/chat`.
- Each assistant message is a list of **parts**; a `PartRenderer` component maps each `tool_result` part to its existing component (see Tool → Component map above) and each `text` part to markdown/text.
- Reuse existing components as-is; only add small list components for `congress_traders` and `thirteenf_funds` (trivial).
- Add loading, empty, and error states per `frontend/UI_STYLE_GUIDE.md`.
- Optional later: stream parts as they arrive (text first, then components as tools complete).

---

## Step-by-Step Build Plan

> Implement these yourself, one at a time. Each step builds on the previous. Ask your mentor for guidance, not code (per `Mentor-mode.md`).
>
> Steps are grouped into **Backend** (1–4), **Generative UI / Frontend** (5–9), and **Tune & Verify** (10–11). The UI steps are broken out in detail since this is a Generative UI app.

### Step 1 — LLM provider layer (backend)
- Add to `backend/requirements.txt`: `langchain`, `langgraph`, `langchain-ollama`, `langchain-openai`.
- Add config vars to `backend/app/core/config.py`: `LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY`.
- Create `backend/app/agents/__init__.py` and `backend/app/agents/llm.py`.
- Define an `LLMProvider` interface and two implementations: `OllamaProvider` (ChatOllama) and `HostedProvider` (ChatOpenAI).
- Add a factory that picks the provider from `settings.LLM_PROVIDER`.
- **Verify:** instantiate each provider from config and confirm it returns a usable chat model object.

### Step 2 — Define tools (backend)
- Create `backend/app/agents/tools.py`.
- Each tool = a Pydantic input schema + a function that wraps an **existing** service function (no new data logic).
- Tools to define: `market_overview`, `sentiment_overview`, `cnn_fng`, `crypto_fng`, `trending`, `stock_detail(symbol)`, `news_feed(symbols)`, `congress_traders`, `congress_trades(name)`, `thirteenf_funds`, `thirteenf_holdings(cik)`, `thirteenf_transactions(cik)`.
- Register with LangChain's `@tool` decorator or `StructuredTool` with clear docstrings (the LLM reads these to decide when to call).
- **Verify:** call each tool function directly and confirm it returns the same data as the corresponding endpoint.

### Step 3 — Build the LangGraph workflow (backend)
- Create `backend/app/agents/graph.py`.
- Define a `State` (TypedDict with `messages`).
- Create an `agent` node: the LLM bound with the tool list.
- Create a `tools` node: a `ToolNode` that executes selected tools.
- Add a conditional edge from `agent`: if the LLM emitted tool calls → go to `tools`; otherwise → `END`.
- Add an edge from `tools` back to `agent` (so the LLM can use tool results and answer).
- Compile the graph.
- **Verify:** invoke the compiled graph with a sample question and confirm it calls a tool and returns a final answer.

### Step 4 — API endpoint + parts assembler (backend)
- Create `backend/app/api/agent.py` with `POST /api/agent/chat`.
- Request body: `{ session_id: str, message: str }`.
- Maintain per-`session_id` memory (start with an in-memory dict; a simple store is fine for V1).
- Invoke the compiled graph with the message + memory.
- **Parts assembler:** after the graph finishes, walk the message history and build an ordered list of parts:
  - `{"type": "text", "content": "..."}` for each assistant text message.
  - `{"type": "tool_result", "tool": "<tool_name>", "data": {...}}` for each tool result (serialize the Pydantic model to dict).
  - Preserve order: text that came before a tool call precedes that tool's result; final summary text comes last.
- Response: `{ "parts": [...], "session_id": "..." }`.
- Register `agent_router` in `main.py`.
- **Verify:** `curl -X POST http://localhost:8000/api/agent/chat -d '{"session_id":"s1","message":"How is the market today?"}'` returns a `parts` array with at least one `text` and one `tool_result` for `market_overview`.

---

### Step 5 — Define the parts + message TypeScript types (frontend)
- In `frontend/src/types/`, add an `agent.ts` (or extend `index.ts`) with:
  - `ChatMessage`: `{ role: "user" | "assistant", parts: ChatPart[] }`.
  - `ChatPart`: a discriminated union:
    - `{ kind: "text"; content: string }`
    - `{ kind: "tool_result"; tool: string; data: unknown }`
  - Map `tool` names to the existing data types already in `types/` (`market`, `sentiment`, `stock-detail`, `trending`, `congress`, `thirteenf`) so `data` can be typed per tool.
- **Verify:** `npm run build` (or `tsc --noEmit`) passes with the new types.

### Step 6 — `useAgentChat` hook (frontend)
- Create `frontend/src/hooks/useAgentChat.ts`.
- State: `messages: ChatMessage[]`, `isLoading`, `error`.
- `sendMessage(text)`: append a user message, `POST` to `/api/agent/chat`, append the returned `parts` as an assistant message, handle loading/error.
- Expose `messages`, `isLoading`, `error`, `sendMessage`, and a `reset`/clear.
- **Verify:** call `sendMessage("How is the market today?")` in a scratch component and `console.log` the returned assistant message parts.

### Step 7 — `PartRenderer` component (frontend — the heart of Generative UI)
- Create `frontend/src/components/PartRenderer.tsx`.
- Takes a `ChatPart` and renders it:
  - `kind === "text"` → render the text (markdown or plain) in the assistant bubble style.
  - `kind === "tool_result"` → switch on `tool` and render the **existing** component with `data`:
    - `market_overview` → `MarketSnapshotStrip` (×3 for usa/india/crypto) + `SectorHeatmap`
    - `sentiment_overview` → `SentimentCards`
    - `cnn_fng` / `crypto_fng` → `FearGreedGauge`
    - `trending` → `TrendingDashboard` (or a compact list variant)
    - `stock_detail` → `QuoteCard` + `StockDetailPanel`
    - `news_feed` → `NewsFeed`
    - `congress_trades` → `CongressTradesPanel`
    - `thirteenf_holdings` / `thirteenf_transactions` → `ThirteenFDashboard`
    - `congress_traders` / `thirteenf_funds` → a small list (new, trivial component)
- Cast `data` to the matching type from Step 5 before passing to each component.
- Wrap rendered components in a subtle container (e.g. `ui-card` or a bordered block) so they read as "inside the chat" but stay visually distinct from text.
- **Verify:** render a `PartRenderer` with a hardcoded `tool_result` part for `stock_detail` and confirm `StockDetailPanel` shows up correctly.

### Step 8 — Rebuild the `/ai-analysis` chat UI (frontend)
- Convert `frontend/src/app/ai-analysis/page.tsx` to a real client component (or extract `AiAnalysisChat` into `components/`).
- Layout (keep the existing TailAdmin look from the mockup):
  - **Chat header** (AI Stock Assistant title) — keep as-is.
  - **Messages area** (scrollable): for each message, render user bubble (right) or assistant block (left). Assistant block = map its `parts` through `PartRenderer` in order.
  - **Input area**: text input + send button; on submit call `sendMessage`.
- States:
  - **Empty**: a welcome prompt + suggested questions (e.g., "How is the market today?", "What's NVDA's P/E?", "What is Pelosi buying?").
  - **Loading**: a typing indicator / spinner while waiting for parts.
  - **Error**: an error card with a retry button (per `UI_STYLE_GUIDE.md`).
- Suggested questions should be clickable and populate the input + send.
- **Verify:** ask "How is the market today?" in the UI and see assistant text + a real `MarketSnapshotStrip` + `SectorHeatmap` rendered inline.

### Step 9 — Make existing components chat-friendly (frontend, as needed)
- Audit the reused components for assumptions that break inside the chat (e.g. full-page layout, their own refresh buttons, fixed heights).
- Most (`QuoteCard`, `NewsFeed`, `CongressTradesPanel`, `ThirteenFDashboard`, `MarketSnapshotStrip`, `SectorHeatmap`, `SentimentCards`, `FearGreedGauge`) already take `data`/`isLoading` props and should work as-is.
- If a component fetches its own data (some may call hooks internally), create a thin "presentational" variant that accepts `data` directly and renders only — no fetching — for use inside `PartRenderer`.
- Add the two small new list components for `congress_traders` and `thirteenf_funds` (simple styled lists per `UI_STYLE_GUIDE.md`).
- **Verify:** each tool's component renders correctly inside a chat bubble at mobile (375px) and desktop widths.

---

### Step 10 — System prompt + tool-selection tuning (backend)
- Write the system prompt in `backend/app/agents/graph.py` (or a `prompts.py`): role, available tools, when to use each, "never hallucinate data — always call a tool", and the V1 question categories.
- Guide the LLM to call the **right tool(s)** for a question and then write a short text summary to accompany the rendered components (the components show the data; the text adds insight).
- Test with sample questions from each category (see Step 11).
- Iterate on prompt wording until the LLM reliably picks the right tool and the parts come back in a sensible order (text → tool_result → summary text).
- **Verify:** the agent picks correct tools for ambiguous phrasings (e.g., "what's Pelosi buying" → `congress_trades("Pelosi")`).

### Step 11 — Test & verify across categories (end-to-end)
Run these sample questions in the UI and confirm: the right tool fires, the matching component renders inline, and the text cites real data.
- Market: "How is the market doing today?" → `MarketSnapshotStrip` + `SectorHeatmap`
- Market: "What are the top gainers and losers today?" → `TrendingDashboard`
- Market: "Where is the VIX and what's the Fear & Greed score?" → `SentimentCards` + `FearGreedGauge`
- Stock: "How is NVDA performing today? What's its P/E?" → `QuoteCard` + `StockDetailPanel`
- Stock: "What's the latest news on AAPL?" → `NewsFeed`
- Smart Money: "What is Nancy Pelosi buying?" → `CongressTradesPanel`
- Smart Money: "What did Berkshire Hathaway just add to its portfolio?" → `ThirteenFDashboard` (transactions)
- Multi-tool: "Give me a market overview and the latest NVDA news" → `MarketSnapshotStrip` + `SectorHeatmap` + `NewsFeed` (confirms multiple parts render in order)

---

## Out of Scope for V1 (future)

These categories need data/features not yet built and are deferred:
- **Portfolio Analysis** — needs portfolio storage + analytics (diversification, concentration, stress tests).
- **Advanced** — Advance/Decline ratio, McClellan Oscillator, % above 50/200-day MA — needs market-wide data.
- **Stock Screener & Discovery** — needs a multi-stock screening engine.
- **Macro** — 10y/2y yields, Fed/FOMC expectations, CPI/PCE/NFP/GDP — needs a macro data source (not currently fetched).
- **Historical comparisons** — 5-year ratio averages, dividend safety scores — needs historical fundamentals.

---

## Appendix: Original Question List

### 1. Market Analysis
- How is the Market Doing today
- What are the top gainers and losers today
- What are the major indices doing today
- What are the sector performances today
- What are the market trends today
- What are the market sentiment today
- What are the market predictions today
- How are Micro and Macro factors affecting the market
- What are the Micro and Macro factors
- Where is the VIX (Volatility Index) and what is the current Fear & Greed Index score?
- What are 10-year / 2-year Treasury yields doing, and is the yield curve inverted?
- What are the expectations for upcoming Fed / FOMC interest rate decisions?
- How are inflation data (CPI, PCE), jobs reports (NFP), and GDP trends affecting the markets?

### 2. Stock Analysis
- How is the stock performing today
- What are the stock fundamentals
- What are the stock technicals
- What are the stock news
- What are the stock events
- What are the stock predictions
- What are the stock forecasts
- what is the Bullishness of the stock
- what is the Bearishness of the stock
- what is the sentiment of the stock
- How does its P/E, P/S, EV/EBITDA, and PEG ratio compare to historical 5-year averages?
- How sustainable is the Debt-to-Equity and Free Cash Flow yield?
- What is the dividend payout ratio and safety score?

### 3. Portfolio Analysis
- How is the portfolio performing today
- What are the portfolio fundamentals
- What are the portfolio technicals
- What are the portfolio news
- What are the portfolio events
- What are the portfolio predictions
- What are the portfolio forecasts
- what is the Bullishness of the portfolio
- what is the Bearishness of the portfolio
- what is the sentiment of the portfolio
- How diversified is the portfolio
- How concentrated is the portfolio
- How would this portfolio perform in a 2008 crash, 2020 COVID shock, or a +100bps interest rate hike?
- Pick few stocks for me to invest in based on my risk tolerance and investment goals.
- Pick few stocks that can beat S&P 500 returns

### 4. Advanced
- What is the Advance/Decline ratio and McClellan Oscillator indicating?
- How many stocks are trading above their 50-day and 200-day moving averages?

### 5. Stock Screener & Discovery (Idea Generation)
- Find me undervalued dividend growth stocks with low debt and positive free cash flow.
- Show me stocks breaking out of a 52-week consolidation on above-average volume.
- What are the top momentum stocks in the strongest sector right now?
- Find beaten-down quality stocks with an RSI under 30 and positive insider buying.
- Which mid-cap growth stocks have revenue growth > 25% and accelerating margins?
