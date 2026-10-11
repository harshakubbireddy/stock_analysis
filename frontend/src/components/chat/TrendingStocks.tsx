"use client";

import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChatCard } from "./ChatCard";
import { fmtCompact, fmtNum, pctStyle } from "./formatters";

// =========================================================
// Trending Stocks — most active / gainers / losers lists
// =========================================================
type TrendingStock = {
  symbol: string;
  name: string;
  price: number | null;
  change_percent: number | null;
  volume: number | null;
};

function signedPct(pct: number | null) {
  return pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—";
}

function StockRow({ s }: { s: TrendingStock }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{s.symbol}</p>
        <p className="ui-caption truncate">{s.name || "—"}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-gray-900 dark:text-white/90">
          {s.price != null ? `$${fmtNum(s.price)}` : "—"}
        </p>
        <p className={`text-xs font-semibold tabular-nums ${pctStyle(s.change_percent)}`}>
          {signedPct(s.change_percent)}
          {s.volume != null && (
            <span className="ml-1.5 font-normal text-gray-400">· Vol {fmtCompact(s.volume)}</span>
          )}
        </p>
      </div>
    </li>
  );
}

function TrendingList({
  title,
  icon,
  description,
  stocks,
}: {
  title: string;
  icon: LucideIcon;
  description: string;
  stocks: TrendingStock[];
}) {
  return (
    <ChatCard title={title} icon={icon} description={description}>
      {stocks.length > 0 ? (
        <ul className="divide-y divide-dashed divide-gray-200 dark:divide-gray-800">
          {stocks.map((s) => (
            <StockRow key={s.symbol} s={s} />
          ))}
        </ul>
      ) : (
        <p className="ui-caption">Data unavailable</p>
      )}
    </ChatCard>
  );
}

export function TrendingStocks(props: Record<string, unknown>) {
  const mostActive = (props.most_active as TrendingStock[]) ?? [];
  const gainers = (props.gainers as TrendingStock[]) ?? [];
  const losers = (props.losers as TrendingStock[]) ?? [];

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
      <TrendingList
        title="Most Active"
        icon={Flame}
        description="Highest volume today"
        stocks={mostActive}
      />
      <TrendingList
        title="Top Gainers"
        icon={TrendingUp}
        description="Biggest % gains today"
        stocks={gainers}
      />
      <TrendingList
        title="Top Losers"
        icon={TrendingDown}
        description="Biggest % losses today"
        stocks={losers}
      />
    </div>
  );
}
