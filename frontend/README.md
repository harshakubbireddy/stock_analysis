# Frontend — Stock Analysis App

Next.js 16 + React 19 + Tailwind CSS v4 + TypeScript frontend for the Stock Analysis app. Talks to the FastAPI backend at `NEXT_PUBLIC_API_BASE_URL`.

> **Read [`AGENTS.md`](./AGENTS.md) and [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md) before writing any frontend code.** This is Next.js 16 / React 19 / Tailwind v4 — not the Next.js you may know — and there is a strict TailAdmin-inspired design system to follow.

## Pages (App Router — `src/app/`)

| Route | File | Component | Description |
|---|---|---|---|
| `/` | `page.tsx` | `MarketOverviewDashboard` | Market snapshot: sentiment, US/India/crypto strips, Fear & Greed, sector heatmap |
| `/trending` | `trending/page.tsx` | `TrendingDashboard` | Most active, gainers, losers |
| `/smart-money` | `smart-money/page.tsx` | `SmartMoneyDashboard` | Congress trades + 13F holdings/transactions |
| `/ai-analysis` | `ai-analysis/page.tsx` | (inline) | **Static mockup** — chat UI shell, not yet wired to a backend agent |

`layout.tsx` renders the persistent `Sidebar` and wraps all pages.

## Components (`src/components/`)

- `Sidebar` — persistent left nav + mobile drawer.
- `MarketOverviewDashboard`, `MarketSnapshotStrip`, `SectorHeatmap` — market overview.
- `SentimentCards`, `FearGreedGauge` — sentiment.
- `NewsFeed`, `QuoteCard`, `StockDetailPanel` — stock detail & news.
- `TrendingDashboard` — trending.
- `SmartMoneyDashboard`, `CongressTradesPanel`, `ThirteenFDashboard` — smart money.

> `components/index.ts` is an empty placeholder (barrel file not yet populated).

## Hooks (`src/hooks/`)

Each hook wraps an Axios call via the shared client in `src/lib/api.ts` and returns `{ data, isLoading, error, refetch, lastUpdated }`-style state.

- `useMarketOverview` → `GET /api/market/overview`
- `useSentiment` → `GET /api/market/sentiment`
- `useFngDetail` → `GET /api/market/sentiment/cnn-fng` | `/crypto-fng`
- `useTrending` → `GET /api/market/trending`
- `useStockDetail` → `GET /api/market/stock/{symbol}`
- `useNewsFeed` → `GET /api/market/news`
- `useCongressTrades` → `GET /api/congress/trades`
- `useThirteenF` → `GET /api/thirteenf/holdings/{cik}` | `/transactions/{cik}`

> `hooks/index.ts` is an empty placeholder (barrel file not yet populated).

## Lib (`src/lib/`)

- `api.ts` — shared Axios instance (`baseURL` from `NEXT_PUBLIC_API_BASE_URL`, 30s timeout).
- `utils.ts` — `cn()` class-merge helper (clsx + tailwind-merge).

## Types (`src/types/`)

TypeScript interfaces mirroring backend Pydantic schemas: `market`, `sentiment`, `stock-detail`, `trending`, `congress`, `thirteenf`. `index.ts` re-exports them.

## Design System

- **Source of truth:** `src/app/tailadmin-theme.css` (tokens & primitives) + [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md) (rules).
- Use `ui-card`, `ui-card-header`, `ui-card-body`, `ui-title`, `ui-description`, `ui-button`, `ui-input`, `ui-badge`, `ui-table`, `ui-icon-box`, `ui-container`, `ui-page` primitives.
- `brand-500` (`#465fff`) for primary actions/active nav/chart highlights.
- Support light and `.dark` themes in every component.
- Recharts for charts, Lucide React for icons.

## Environment

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` | Backend API base URL |

## Scripts

```bash
npm run dev     # dev server on :3000
npm run build   # production build
npm run start   # run production build
npm run lint    # eslint
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Make sure the backend is running (see root [`README.md`](../README.md)).

## Notes

- This project was bootstrapped with `create-next-app`; the default boilerplate has been replaced with the stock-analysis product.
- Next.js 16 / React 19 / Tailwind v4 have breaking changes — consult `node_modules/next/dist/docs/` and heed deprecation notices when in doubt.
