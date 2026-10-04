"use client";

import type { StockAnalysisProps, StockChartPoint } from "@/types/stockAnalysis";
import { fmtNum, pctStyle } from "./formatters";

export function MiniSparkline({ points }: { points: StockChartPoint[] }) {
  if (points.length < 2) return null;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p.price - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = prices[prices.length - 1] >= prices[0];
  const color = up ? "#12b76a" : "#f04438";
  const area = `${path} L${w},${h} L0,${h} Z`;
  const gradId = up ? "spark-up" : "spark-down";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ui-tile min-w-0">
      <p className="ui-label truncate">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tabular-nums text-gray-900 dark:text-white/90">
        {value}
      </p>
      {sub && <p className="ui-caption mt-0.5 truncate tabular-nums">{sub}</p>}
    </div>
  );
}

export function FiftyTwoWeekRange(props: StockAnalysisProps) {
  const { fifty_two_week_low: low, fifty_two_week_high: high, price, fifty_two_week_position_pct: pos } = props;
  if (low == null || high == null || price == null) return null;
  const markerPos = pos != null ? Math.max(0, Math.min(100, pos)) : 50;
  return (
    <div>
      <p className="ui-label mb-1">52-week range</p>
      <div className="ui-caption mb-2 flex justify-between tabular-nums">
        <span>Low {fmtNum(low)}</span>
        <span className="font-semibold text-gray-900 dark:text-white/90">
          {fmtNum(price)} · {pos?.toFixed(0)}% of range
        </span>
        <span>High {fmtNum(high)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-error-500/70 via-warning-500/70 to-success-500/70">
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500 shadow-theme-sm dark:border-gray-900"
          style={{ left: `${markerPos}%` }}
        />
      </div>
    </div>
  );
}

export function AnalystTargetsBar(props: StockAnalysisProps) {
  const { analyst_targets: t, price } = props;
  if (t.low == null || t.high == null) return null;
  const range = t.high - t.low || 1;
  const posFor = (v: number | null) =>
    v == null ? null : Math.max(0, Math.min(100, ((v - t.low!) / range) * 100));
  const pricePos = posFor(price);
  const meanPos = posFor(t.mean);
  return (
    <div>
      <div className="relative h-8 rounded-lg bg-gray-100 dark:bg-white/5">
        {meanPos != null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-brand-500"
            style={{ left: `${meanPos}%` }}
            title={`Mean target $${t.mean}`}
          />
        )}
        {pricePos != null && (
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-800 shadow-theme-sm dark:border-gray-900 dark:bg-white"
            style={{ left: `${pricePos}%` }}
            title={`Current $${price}`}
          />
        )}
      </div>
      <div className="ui-caption mt-1.5 flex justify-between tabular-nums">
        <span>Low {fmtNum(t.low)}</span>
        <span className="font-medium text-brand-600 dark:text-brand-300">Mean {fmtNum(t.mean)}</span>
        <span>High {fmtNum(t.high)}</span>
      </div>
      {t.upside_pct != null && (
        <p className={`mt-1.5 text-xs font-semibold tabular-nums ${pctStyle(t.upside_pct)}`}>
          {t.upside_pct >= 0 ? "+" : ""}
          {t.upside_pct.toFixed(1)}% vs mean target
        </p>
      )}
    </div>
  );
}

export function RecommendationBars(props: StockAnalysisProps) {
  const r = props.recommendations;
  const total = r.strong_buy + r.buy + r.hold + r.sell + r.strong_sell || 1;
  const segments = [
    { label: "Strong Buy", count: r.strong_buy, cls: "bg-success-600" },
    { label: "Buy", count: r.buy, cls: "bg-success-500" },
    { label: "Hold", count: r.hold, cls: "bg-warning-500" },
    { label: "Sell", count: r.sell, cls: "bg-error-500" },
    { label: "Strong Sell", count: r.strong_sell, cls: "bg-error-600" },
  ];
  return (
    <div>
      <div className="flex h-2.5 gap-px overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.cls}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1 text-center">
        {segments.map((s) => (
          <div key={s.label}>
            <p className="text-base font-semibold tabular-nums text-gray-900 dark:text-white/90">{s.count}</p>
            <p className="ui-caption flex items-center justify-center gap-1">
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.cls}`} aria-hidden="true" />
              <span className="truncate">{s.label}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
