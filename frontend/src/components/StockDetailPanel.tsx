"use client";

import { format } from "date-fns";
import { TrendingDown, TrendingUp, X } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockDetail } from "@/hooks/useStockDetail";
import { cn } from "@/lib/utils";
import { formatPrice } from "./QuoteCard";

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

export function StockDetailPanel({
  symbol,
  onClose,
}: {
  symbol: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useStockDetail(symbol);

  const pct = data?.change_percent ?? null;
  const isUp = pct !== null && pct >= 0;
  const lineColor = isUp ? "#12b76a" : "#f04438";

  const points = data?.intraday ?? [];
  const values = data?.previous_close
    ? [...points.map((p) => p.price), data.previous_close]
    : points.map((p) => p.price);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = (max - min) * 0.05 || 1;

  return (
    <section className="ui-card">
      <header className="ui-card-header">
        <div>
          <h2 className="ui-title">
            {data?.name ?? symbol}
            <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
              {symbol}
            </span>
          </h2>
          <p className="ui-description">Intraday performance and key stats</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.price != null && (
            <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
              {formatPrice(data.price)}
            </span>
          )}
          {pct !== null && (
            <span
              className={cn(
                "ui-badge",
                isUp ? "ui-badge-success" : "ui-badge-error",
              )}
            >
              {isUp ? (
                <TrendingUp size={14} aria-hidden="true" />
              ) : (
                <TrendingDown size={14} aria-hidden="true" />
              )}
              {isUp ? "+" : ""}
              {pct.toFixed(2)}%
            </span>
          )}
          <button
            type="button"
            aria-label={`Close details for ${symbol}`}
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="ui-card-body">
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        ) : error ? (
          <p className="py-10 text-center text-sm text-error-600 dark:text-error-500">
            {error}
          </p>
        ) : data ? (
          <>
            <div className="h-64">
              {points.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={points}
                    margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid stroke="#e4e7ec" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value: string) =>
                        format(new Date(value), "HH:mm")
                      }
                      tick={{ fontSize: 12, fill: "#98a2b3" }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={48}
                    />
                    <YAxis
                      domain={[min - pad, max + pad]}
                      tick={{ fontSize: 12, fill: "#98a2b3" }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(value: number) => formatPrice(value)}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        format(new Date(String(value)), "HH:mm")
                      }
                      formatter={(value) => [formatPrice(Number(value)), "Price"]}
                    />
                    {data.previous_close !== null && (
                      <ReferenceLine
                        y={data.previous_close}
                        stroke="#98a2b3"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={lineColor}
                      strokeWidth={2}
                      fill={lineColor}
                      fillOpacity={0.12}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                  No intraday data available
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <StatTile
                label="Day range"
                value={`${formatPrice(data.day_low)} – ${formatPrice(data.day_high)}`}
              />
              <StatTile
                label="52-week range"
                value={`${formatPrice(data.fifty_two_week_low)} – ${formatPrice(data.fifty_two_week_high)}`}
              />
              <StatTile
                label="Market cap"
                value={
                  data.market_cap != null
                    ? compactNumber.format(data.market_cap)
                    : "—"
                }
              />
              <StatTile
                label="P/E (TTM)"
                value={data.trailing_pe != null ? data.trailing_pe.toFixed(2) : "—"}
              />
              <StatTile
                label="Volume"
                value={
                  data.volume != null ? compactNumber.format(data.volume) : "—"
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
