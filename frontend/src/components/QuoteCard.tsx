"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { MarketQuote } from "@/types/market";

export function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function QuoteCard({ quote }: { quote: MarketQuote }) {
  const pct = quote.change_percent;
  const isUp = pct !== null && pct >= 0;
  const lineColor = isUp ? "#12b76a" : "#f04438";
  const prevClose =
    quote.price !== null && quote.change !== null
      ? quote.price - quote.change
      : null;

  const data = quote.sparkline.map((value, index) => ({ index, value }));
  const values =
    prevClose !== null ? [...quote.sparkline, prevClose] : quote.sparkline;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = (max - min) * 0.05 || 1;

  return (
    <article className="ui-card flex items-center gap-4 p-5">
      <div className="w-32 shrink-0">
        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
          {quote.name}
        </h3>
        <p className="truncate text-xs text-gray-400 dark:text-gray-500">
          {quote.symbol}
        </p>
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-sm font-medium",
            pct === null
              ? "text-gray-400 dark:text-gray-500"
              : isUp
                ? "text-success-600 dark:text-success-500"
                : "text-error-600 dark:text-error-500",
          )}
        >
          {pct === null ? (
            "No data"
          ) : (
            <>
              {isUp ? (
                <TrendingUp size={14} aria-hidden="true" />
              ) : (
                <TrendingDown size={14} aria-hidden="true" />
              )}
              {isUp ? "+" : ""}
              {pct.toFixed(2)}%
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          {formatPrice(quote.price)}
        </p>
      </div>

      <div className="h-16 min-w-0 flex-1">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <YAxis hide domain={[min - pad, max + pad]} />
              {prevClose !== null && (
                <ReferenceLine
                  y={prevClose}
                  stroke="#98a2b3"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              )}
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
