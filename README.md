# Stock Analysis App

A stock market research app with a Python/FastAPI backend that pulls live market data, sentiment, congressional trades, and institutional 13F filings, and a Next.js/TypeScript frontend with a TailAdmin-inspired dashboard UI.

> An AI chat agent for the `/ai-analysis` page is **planned but not yet built** — it will be a **Generative UI** agent that renders real dashboard components inline in the chat. See [`plan.md`](./plan.md) for the design and step-by-step build plan.

## Project Structure

```
my_stocks_analysis/
├── backend/               # FastAPI backend (data services, no LLM yet)
│   ├── app/
│   │   ├── api/           # Route handlers (congress, market, thirteenf)
│   │   ├── core/          # Configuration (config.py)
│   │   ├── schemas/       # Pydantic response models
│   │   ├── services/      # Data services (yfinance, SEC EDGAR, House Clerk, RSS)
│   │   └── main.py        # FastAPI app entrypoint
│   ├── requirements.txt
│   ├── .env.example
│   └── .venv/             # Python virtual environment
├── frontend/              # Next.js 16 + React 19 + Tailwind v4 + TypeScript
│   ├── src/
│   │   ├── app/           # App Router pages (overview, trending, smart-money, ai-analysis)
│   │   ├── components/    # React dashboard components
│   │   ├── hooks/         # Data-fetching hooks (axios → backend)
│   │   ├── lib/           # API client & utilities
│   │   └── types/         # TypeScript type definitions
│   ├── UI_STYLE_GUIDE.md  # TailAdmin-inspired design system rules
│   ├── AGENTS.md          # Next.js 16 + UI rules for LLMs
│   └── package.json
├── Mentor-mode.md         # "I Build, You Guide" mentoring rules
├── plan.md                # AI agent design + step-by-step build plan
└── README.md
```

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- No LLM/Ollama required for the current data features. (The planned AI agent will support a pluggable local or hosted LLM — see `plan.md`.)

## Backend Setup

```bash
cd backend

# Create & activate virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env as needed (CORS origins, SEC User-Agent)

# Run the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at `http://localhost:8000/docs`

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local as needed (NEXT_PUBLIC_API_BASE_URL)

# Run dev server
npm run dev
```

Frontend available at `http://localhost:3000`

## API Endpoints

All routes are prefixed and grouped by router.

### Market (`/api/market`)
| Method | Path | Description | Data source |
|---|---|---|---|
| GET | `/api/market/overview` | US & India indices, crypto, US sector ETFs quotes + sparklines | yfinance |
| GET | `/api/market/sentiment` | Sentiment cards (currently VIX) | yfinance (`^VIX`) |
| GET | `/api/market/sentiment/cnn-fng` | CNN Fear & Greed detail + history + comparisons | `fear-greed` package |
| GET | `/api/market/sentiment/crypto-fng` | Crypto Fear & Greed detail + history + comparisons | alternative.me API |
| GET | `/api/market/trending` | Most active, gainers, losers | yfinance `screen` |
| GET | `/api/market/stock/{symbol}` | Quote, PE, 52-week range, market cap, intraday 5m chart | yfinance |
| GET | `/api/market/news?symbols=AAPL,MSFT` | News for up to 6 symbols | yfinance news → Google News RSS fallback |
| GET | `/api/market/news/more?symbols=` | Additional news via Google News RSS | Google News RSS |

### Congress (`/api/congress`)
| Method | Path | Description | Data source |
|---|---|---|---|
| GET | `/api/congress/traders` | List of tracked politicians | hardcoded |
| GET | `/api/congress/trades?name=Pelosi` | Parsed PTR trades for a politician | House Clerk PDFs (`pdfplumber`) |

### ThirteenF (`/api/thirteenf`)
| Method | Path | Description | Data source |
|---|---|---|---|
| GET | `/api/thirteenf/funds` | List of tracked institutional funds | hardcoded |
| GET | `/api/thirteenf/holdings/{cik}` | Latest 13F-HR top holdings | SEC EDGAR XML |
| GET | `/api/thirteenf/transactions/{cik}` | Diff of two latest 13F filings (new buys / adds / trims / exits) | SEC EDGAR XML |

### Notes
- `api/stocks.py` and `services/stock_data.py` are placeholders (not registered).
- In-memory caching: Congress index (6h) + PDF cache; 13F holdings/transactions (1h).

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Overview | Market snapshot: sentiment cards, US/India/crypto strips, Fear & Greed gauges, sector heatmap |
| `/trending` | Trending | Most active, gainers, losers |
| `/smart-money` | Smart Money | Congress trades + 13F holdings/transactions for institutional funds |
| `/ai-analysis` | AI Analysis | **Static mockup** — chat UI shell, not yet wired to a backend agent |

Each page uses a dedicated hook (`useMarketOverview`, `useTrending`, `useCongressTrades`, `useThirteenF`, etc.) that calls the backend via the shared Axios client in `src/lib/api.ts`.

## Tech Stack

### Backend
- **FastAPI** — Web framework
- **yfinance** — Market quotes, stock detail, trending, news
- **fear-greed** — CNN Fear & Greed index
- **pdfplumber** — Parsing House PTR PDF disclosures
- **httpx** — SEC EDGAR, alternative.me, Google News RSS
- **pandas / numpy** — Data processing
- **ta** — Technical analysis indicators (declared, not yet used)
- **pydantic / pydantic-settings** — Schemas & config

### Frontend
- **Next.js 16** — React framework (App Router)
- **React 19** — UI library
- **Tailwind CSS v4** — Styling
- **Recharts** — Charting library
- **Axios** — HTTP client
- **Lucide React** — Icons
- **clsx / tailwind-merge** — Class utilities

> The frontend uses Next.js 16 / React 19 / Tailwind v4, which have breaking changes from older versions. See `frontend/AGENTS.md` and `frontend/UI_STYLE_GUIDE.md` before editing frontend code.

## LLM Context Files

- [`AGENTS.md`](./AGENTS.md) — Root architecture & conventions for any LLM assistant.
- [`frontend/AGENTS.md`](./frontend/AGENTS.md) — Next.js 16 + UI design rules.
- [`Mentor-mode.md`](./Mentor-mode.md) — "I Build, You Guide" mentoring rules.
- [`plan.md`](./plan.md) — AI agent design + step-by-step build plan.
