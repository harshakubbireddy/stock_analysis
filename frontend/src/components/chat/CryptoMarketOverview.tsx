"use client";

import { Bitcoin, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { ChatCard } from "./ChatCard";
import { fmtNum, pctStyle } from "./formatters";
import { SentimentTile, type SentimentCardData } from "./SentimentTiles";

// =========================================================
// Crypto Market Overview — coin quotes + Crypto Fear & Greed
// =========================================================
type CryptoQuote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
};

function signedPct(pct: number | null) {
  return pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—";
}

function fmtPrice(price: number | null) {
  if (price == null) return "—";
  return `$${fmtNum(price, price < 10 ? 4 : 2)}`;
}

function CoinRow({ q }: { q: CryptoQuote }) {
  const up = (q.change_percent ?? 0) >= 0;
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{q.name}</p>
        <p className="ui-caption">{q.symbol.replace("-USD", "")}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-gray-900 dark:text-white/90">{fmtPrice(q.price)}</p>
        <p className={`flex items-center justify-end gap-1 text-xs font-semibold tabular-nums ${pctStyle(q.change_percent)}`}>
          {q.change_percent != null &&
            (up ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />)}
          {signedPct(q.change_percent)}
        </p>
      </div>
    </li>
  );
}

export function CryptoMarketOverview(props: Record<string, unknown>) {
  const quotes = (props.quotes as CryptoQuote[]) ?? [];
  const fearGreed = props.fear_greed as SentimentCardData | undefined;

  const btc = quotes.find((q) => q.symbol === "BTC-USD");
  const btcUp = (btc?.change_percent ?? 0) >= 0;

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-5">
      <ChatCard
        title="Crypto Prices"
        icon={Bitcoin}
        description="Top coins vs. USD, 24h change"
        className="xl:col-span-3"
        aside={
          btc?.change_percent != null && (
            <span className={`ui-badge ${btcUp ? "ui-badge-success" : "ui-badge-error"}`}>
              BTC {signedPct(btc.change_percent)}
            </span>
          )
        }
      >
        {quotes.length > 0 ? (
          <ul className="divide-y divide-dashed divide-gray-200 dark:divide-gray-800">
            {quotes.map((q) => (
              <CoinRow key={q.symbol} q={q} />
            ))}
          </ul>
        ) : (
          <p className="ui-caption">Crypto data unavailable</p>
        )}
      </ChatCard>

      <ChatCard
        title="Crypto Sentiment"
        icon={Gauge}
        description="Fear & Greed index (0 = extreme fear, 100 = extreme greed)"
        className="xl:col-span-2"
      >
        {fearGreed ? <SentimentTile card={fearGreed} /> : <p className="ui-caption">Sentiment unavailable</p>}
      </ChatCard>
    </div>
  );
}
