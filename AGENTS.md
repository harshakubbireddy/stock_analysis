# AGENTS.md — Stock Analysis App

Context for any LLM assistant (Devin, Claude, Cursor, etc.) working on this repo. Read this first, then the linked files for area-specific rules.

## What this app is

A stock market research app: a FastAPI backend that pulls live market data, sentiment, congressional trades, and institutional 13F filings, plus a Next.js frontend with a TailAdmin-inspired dashboard. A **Generative UI** AI chat agent is **planned but not yet built** — it will render real dashboard components inline in the chat by calling existing services as tools (see `plan.md`).

## Repo layout

```
backend/   FastAPI backend — data services only (no LLM yet)
frontend/  Next.js 16 + React 19 + Tailwind v4 + TypeScript
Mentor-mode.md  "I Build, You Guide" mentoring rules
plan.md         AI agent design + step-by-step build plan
README.md       Project overview, setup, endpoints
```

## Backend (`backend/app/`)

**Entry:** `main.py` — FastAPI app, CORS, registers 3 routers: `congress`, `market`, `thirteenf`.

**Routers (`api/`):**
- `market.py` — `/api/market/*` (overview, sentiment, cnn-fng, crypto-fng, trending, stock/{symbol}, news, news/more)
- `congress.py` — `/api/congress/{traders,trades}`
- `thirteenf.py` — `/api/thirteenf/{funds,holdings/{cik},transactions/{cik}}`
- `stocks.py` — **placeholder, not registered**

**Services (`services/`) — all data logic lives here:**
- `market_data.py` — yfinance quotes for US/India indices, crypto, US sector ETFs (5d daily + 1d hourly sparklines).
- `sentiment.py` — VIX (yfinance), CNN Fear & Greed (`fear-greed` pkg), Crypto Fear & Greed (alternative.me API).
- `stock_detail.py` — yfinance stock quote/PE/52w/intraday; news via yfinance → Google News RSS fallback.
- `trending.py` — yfinance `screen` for most active / gainers / losers.
- `congress.py` — House Clerk PTR PDFs parsed with `pdfplumber`; in-memory index (6h) + PDF cache.
- `thirteenf.py` — SEC EDGAR 13F-HR XML parsing; holdings + diff of two latest filings (new_buy/add/trim/exit); 1h cache.
- `stock_data.py` — **placeholder, not used.**

**Schemas (`schemas/`):** Pydantic models matching each response — `market`, `sentiment`, `stock_detail`, `trending`, `congress`, `thirteenf`.

**Config (`core/config.py`):** `Settings` via `pydantic-settings` — `API_HOST`, `API_PORT`, `CORS_ORIGINS`, `SEC_USER_AGENT`. Reads `.env`.

**Dependencies (`requirements.txt`):** fastapi, uvicorn, yfinance, pandas, numpy, ta, fear-greed, pydantic, pydantic-settings, python-dotenv, httpx, pdfplumber. (LangChain/LangGraph/Ollama are **not** installed yet — they're planned for the AI agent.)

## Frontend (`frontend/src/`)

**Rules:** Read `frontend/AGENTS.md` (Next.js 16 / React 19 / Tailwind v4 breaking changes) and `frontend/UI_STYLE_GUIDE.md` (TailAdmin-inspired design system) before editing any frontend code.

**Pages (`app/`):** `/` (Overview), `/trending`, `/smart-money`, `/ai-analysis` (static mockup). `layout.tsx` renders the `Sidebar` + main wrapper.

**Components (`components/`):** Dashboard widgets for each page — `MarketOverviewDashboard`, `MarketSnapshotStrip`, `SectorHeatmap`, `SentimentCards`, `FearGreedGauge`, `NewsFeed`, `QuoteCard`, `StockDetailPanel`, `TrendingDashboard`, `SmartMoneyDashboard`, `CongressTradesPanel`, `ThirteenFDashboard`, `Sidebar`. (`components/index.ts` is an empty placeholder.)

**Hooks (`hooks/`):** One per backend endpoint group — `useMarketOverview`, `useSentiment`, `useFngDetail`, `useTrending`, `useStockDetail`, `useNewsFeed`, `useCongressTrades`, `useThirteenF`. (`hooks/index.ts` is an empty placeholder.)

**Lib (`lib/`):** `api.ts` (shared Axios client, `NEXT_PUBLIC_API_BASE_URL`, 30s timeout), `utils.ts` (`cn()` helper).

**Types (`types/`):** TS interfaces mirroring backend schemas.

**Design system:** `tailadmin-theme.css` tokens + `UI_STYLE_GUIDE.md` rules. Use `ui-card`, `ui-button`, `ui-input`, `ui-badge`, `ui-table`, `ui-icon-box`, `ui-container`, `ui-page` primitives. `brand-500` (`#465fff`) for primary/active. Support light + dark themes.

## Data flow

```
Frontend hook → src/lib/api.ts (Axios) → FastAPI router → service → external source
External sources: yfinance, SEC EDGAR, House Clerk PDFs, alternative.me, Google News RSS, fear-greed pkg
```

## Conventions

- Backend: FastAPI routers are thin wrappers over `services/`; all data logic and external calls live in `services/`. Pydantic schemas in `schemas/` define response shapes. Defensive try/except per external call (services degrade gracefully, returning `error` fields rather than crashing).
- Frontend: server pages are thin shells that render a client dashboard component; data fetching lives in hooks, not components. Follow the UI style guide primitives; never revert to default Next.js styling.
- No git commits exist yet (repo is untracked).

## Known placeholders / TODO

- `backend/app/api/stocks.py`, `backend/app/services/stock_data.py` — empty placeholders.
- `frontend/src/components/index.ts`, `frontend/src/hooks/index.ts` — empty barrel placeholders.
- `frontend/src/app/ai-analysis/page.tsx` — static chat mockup, not wired to any backend.
- `ta` (technical analysis) is in `requirements.txt` but unused.
- The AI agent (LangGraph + pluggable LLM + tools wrapping existing services + Generative UI rendering of existing components) is designed in `plan.md` but not implemented.

## Mentoring mode

`Mentor-mode.md` establishes an "I Build, You Guide" rule: the user builds the app themselves to learn. Default to guiding (approaches, trade-offs, questions, pseudo-code) rather than writing full implementations, unless the user explicitly asks for code.
