"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatPrice } from "./QuoteCard";
import type { MarketQuote } from "@/types/market";

function SnapshotCard({ quote }: { quote: MarketQuote }) {
  const pct = quote.change_percent;
  const isUp = pct !== null && pct >= 0;
  const lineColor = isUp ? "#12b76a" : "#f04438";

  const data = quote.sparkline.map((value, index) => ({ index, value }));
  const values = quote.sparkline;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = (max - min) * 0.05 || 1;

  return (
    <article className="ui-card flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
            {quote.name}
          </h3>
          <p className="truncate text-xs text-gray-400 dark:text-gray-500">
            {quote.symbol}
          </p>
        </div>
        <span
          className={cn(
            "ui-badge shrink-0",
            pct === null
              ? "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
              : isUp
                ? "ui-badge-success"
                : "ui-badge-error",
          )}
        >
          {pct === null ? (
            "—"
          ) : (
            <>
              {isUp ? (
                <TrendingUp size={12} aria-hidden="true" />
              ) : (
                <TrendingDown size={12} aria-hidden="true" />
              )}
              {isUp ? "+" : ""}
              {pct.toFixed(2)}%
            </>
          )}
        </span>
      </div>

      <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
        {formatPrice(quote.price)}
      </p>

      <div className="h-10">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <YAxis hide domain={[min - pad, max + pad]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={1.5}
                fill={lineColor}
                fillOpacity={0.12}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
            No chart data
          </p>
        )}
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
  );
}

export function MarketSnapshotStrip({
  quotes,
  isLoading,
  title,
  description,
}: {
  quotes: MarketQuote[];
  isLoading: boolean;
  title?: string;
  description?: string;
}) {
  const hasHeader = Boolean(title || description);

  // Pick a column count that fills the row without leaving empty cells.
  // 1 quote -> 1 col, 2 -> 2 cols, 3 -> 3 cols, 4+ -> 4 cols.
  const colCount = Math.min(Math.max(quotes.length, 1), 4);
  const xlColClass: Record<number, string> = {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
  };

  const grid = (() => {
    if (isLoading && quotes.length === 0) {
      const tiles = 4;
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: tiles }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (quotes.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          No data available
        </p>
      );
    }

    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          xlColClass[colCount],
        )}
      >
        {quotes.map((quote) => (
          <SnapshotCard key={quote.symbol} quote={quote} />
        ))}
      </div>
    );
  })();

  if (!hasHeader) {
    return grid;
  }

  return (
    <section>
      {title && <h2 className="ui-title">{title}</h2>}
      {description && <p className="ui-description">{description}</p>}
      <div className="mt-4">{grid}</div>
    </section>
  );
}
