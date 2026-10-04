"use client";

import { Landmark, Percent, Spline } from "lucide-react";
import type { YieldRow } from "@/types/chat";
import { ChatCard, Stat } from "./ChatCard";
import { pctStyle } from "./formatters";

// =========================================================
// Bond Market Overview — yields, curve, ETFs
// =========================================================
export function BondMarketOverview(props: Record<string, unknown>) {
  const yields = (props.yields as YieldRow[]) ?? [];
  const curve = (props.curve as YieldRow[]) ?? [];
  const etfs =
    (props.etfs as { symbol: string; name: string; price: number | null; change_percent: number | null }[]) ?? [];
  const spread = props.spread_13w_10y_bps as number | null;
  const shape = props.curve_shape as string;
  const maxYield = Math.max(...curve.map((c) => c.yield_pct ?? 0), 1);
  const inverted = spread != null && spread < 0;

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-5">
      {/* Yields */}
      <ChatCard
        title="Treasury Yields"
        icon={Percent}
        description={(props.summary as string) || "US Treasury yields across the curve"}
        className="xl:col-span-3"
        aside={
          spread != null && (
            <span className={`ui-badge ${inverted ? "ui-badge-error" : "ui-badge-success"}`}>
              13W–10Y {spread > 0 ? "+" : ""}
              {spread.toFixed(0)} bps · {shape}
            </span>
          )
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {yields.map((y) => (
            <Stat
              key={y.symbol}
              label={y.name}
              value={y.yield_pct != null ? `${y.yield_pct.toFixed(2)}%` : "—"}
              sub={
                <>
                  {y.change_bps != null ? (
                    <span className={pctStyle(y.change_bps)}>
                      {y.change_bps >= 0 ? "▲" : "▼"} {Math.abs(y.change_bps).toFixed(0)} bps
                    </span>
                  ) : (
                    "—"
                  )}
                  {y.month_ago_yield_pct != null && ` · 1M ${y.month_ago_yield_pct.toFixed(2)}%`}
                </>
              }
            />
          ))}
        </div>
      </ChatCard>

      {/* Curve */}
      {curve.length > 0 && (
        <ChatCard
          title="Yield Curve"
          icon={Spline}
          description="Short to long maturities"
          className="xl:col-span-2"
        >
          <div className="space-y-2">
            {curve.map((c) => (
              <div key={c.symbol} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs text-gray-600 dark:text-gray-400">
                  {c.maturity_years === 0.25 ? "3 Mo" : `${c.maturity_years} Yr`}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-white/5">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${((c.yield_pct ?? 0) / maxYield) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                  {c.yield_pct?.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </ChatCard>
      )}

      {/* Bond ETFs */}
      {etfs.length > 0 && (
        <ChatCard
          title="Bond ETFs"
          icon={Landmark}
          description="Price action across duration and credit"
          className="xl:col-span-5"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {etfs.map((e) => (
              <Stat
                key={e.symbol}
                label={e.symbol}
                value={e.price != null ? `$${e.price.toLocaleString()}` : "—"}
                sub={
                  <>
                    <span className={`font-semibold ${pctStyle(e.change_percent)}`}>
                      {e.change_percent != null
                        ? `${e.change_percent >= 0 ? "+" : ""}${e.change_percent.toFixed(2)}%`
                        : "—"}
                    </span>
                    {" · "}
                    {e.name}
                  </>
                }
              />
            ))}
          </div>
        </ChatCard>
      )}
    </div>
  );
}
