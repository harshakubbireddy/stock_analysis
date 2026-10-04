"use client";

import { Activity, Globe2, TrendingDown, TrendingUp } from "lucide-react";
import { ChatCard } from "./ChatCard";
import { marketSummary, pctBar, pctStyle } from "./formatters";

// =========================================================
// Stock Market Overview — index grid cards + sector bars
// =========================================================
type IndexQuote = {
  name: string;
  symbol: string;
  price: number | null;
  change_percent: number | null;
};

function fmtPct(pct: number | null) {
  return pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—";
}

function IndexTile({ q }: { q: IndexQuote }) {
  const up = (q.change_percent ?? 0) >= 0;
  return (
    <div className="ui-tile min-w-0">
      <p className="ui-label truncate">{q.name}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-gray-900 dark:text-white/90">
        {q.price?.toLocaleString() ?? "—"}
      </p>
      <p className={`mt-0.5 flex items-center gap-1 text-xs font-semibold tabular-nums ${pctStyle(q.change_percent)}`}>
        {q.change_percent != null &&
          (up ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />)}
        {fmtPct(q.change_percent)}
      </p>
    </div>
  );
}

function IndexGroup({ title, quotes }: { title: string; quotes: IndexQuote[] }) {
  if (quotes.length === 0) return null;
  return (
    <div>
      <p className="ui-label mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {quotes.map((q) => (
          <IndexTile key={q.symbol} q={q} />
        ))}
      </div>
    </div>
  );
}

export function StockMarketOverview(props: Record<string, unknown>) {
  const usa = (props.usa as IndexQuote[]) ?? [];
  const india = (props.india as IndexQuote[]) ?? [];
  const crypto = (props.crypto as IndexQuote[]) ?? [];
  const sectors = (props.usa_sectors as { name: string; change_percent: number | null }[]) ?? [];

  const sp500 = usa.find((q) => q.name === "S&P 500");
  const up = (sp500?.change_percent ?? 0) >= 0;
  const sorted = [...sectors].sort((a, b) => (b.change_percent ?? 0) - (a.change_percent ?? 0));
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.change_percent ?? 0)), 0.5);

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-5">
      {/* Indices */}
      <ChatCard
        title="Global Indices"
        icon={Globe2}
        description={marketSummary(usa)}
        className="xl:col-span-3"
        aside={
          sp500?.change_percent != null && (
            <span className={`ui-badge ${up ? "ui-badge-success" : "ui-badge-error"}`}>
              S&amp;P {fmtPct(sp500.change_percent)}
            </span>
          )
        }
        bodyClassName="space-y-5"
      >
        <IndexGroup title="United States" quotes={usa} />
        <IndexGroup title="India" quotes={india} />
        <IndexGroup title="Crypto" quotes={crypto} />
      </ChatCard>

      {/* Sector performance */}
      <ChatCard
        title="Sector Performance"
        icon={Activity}
        description="US sector ETFs, sorted by today's move"
        className="xl:col-span-2"
      >
        <div className="space-y-2.5">
          {sorted.map((s) => {
            const pct = s.change_percent ?? 0;
            const width = Math.min((Math.abs(pct) / maxAbs) * 100, 100);
            return (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-gray-600 dark:text-gray-400">
                  {s.name}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-white/5">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${pctBar(s.change_percent)}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className={`w-16 shrink-0 text-right text-xs font-semibold tabular-nums ${pctStyle(s.change_percent)}`}>
                  {fmtPct(s.change_percent)}
                </span>
              </div>
            );
          })}
          {sorted.length === 0 && <p className="ui-caption">Sector data unavailable</p>}
        </div>
      </ChatCard>
    </div>
  );
}
