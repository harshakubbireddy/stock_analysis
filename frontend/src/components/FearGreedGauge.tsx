"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useFngDetail } from "@/hooks/useFngDetail";
import type { FngComparison } from "@/types/sentiment";

const ZONES = [
  { name: "Extreme Fear", min: 0, max: 25, color: "#f04438" },
  { name: "Fear", min: 25, max: 45, color: "#f79009" },
  { name: "Neutral", min: 45, max: 55, color: "#98a2b3" },
  { name: "Greed", min: 55, max: 75, color: "#12b76a" },
  { name: "Extreme Greed", min: 75, max: 100, color: "#067647" },
] as const;

function zoneForScore(score: number) {
  return ZONES.find((z) => score < z.max) ?? ZONES[ZONES.length - 1];
}

const CX = 160;
const CY = 150;
const R_OUTER = 132;
const R_INNER = 84;
const GAP = 1;

function polar(radius: number, value: number) {
  const angle = ((180 - value * 1.8) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function bandPath(min: number, max: number) {
  const o1 = polar(R_OUTER, min);
  const o2 = polar(R_OUTER, max);
  const i2 = polar(R_INNER, max);
  const i1 = polar(R_INNER, min);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

function Gauge({ value, label }: { value: number; label: string }) {
  const activeZone = zoneForScore(value);
  const needleTip = polar(R_INNER - 8, value);
  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={`${label} gauge showing ${Math.round(value)} out of 100, ${activeZone.name}`}
      className="w-full max-w-md"
    >
      {ZONES.map((zone) => {
        const isActive = zone.name === activeZone.name;
        const mid = (zone.min + zone.max) / 2;
        const labelPos = polar((R_INNER + R_OUTER) / 2, mid);
        const rotation = 90 - mid * 1.8;
        return (
          <g key={zone.name}>
            <path
              d={bandPath(zone.min + GAP / 2, zone.max - GAP / 2)}
              fill={isActive ? zone.color : undefined}
              className={cn(!isActive && "fill-gray-100 dark:fill-white/5")}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${rotation} ${labelPos.x} ${labelPos.y})`}
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wider",
                isActive ? "fill-white" : "fill-gray-500 dark:fill-gray-400"
              )}
            >
              {zone.name}
            </text>
          </g>
        );
      })}

      {ticks.map((tick) => {
        const pos = polar(R_INNER - 12, tick);
        return (
          <text
            key={tick}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-[10px] dark:fill-gray-500"
          >
            {tick}
          </text>
        );
      })}

      <line
        x1={CX}
        y1={CY}
        x2={needleTip.x}
        y2={needleTip.y}
        strokeWidth={5}
        strokeLinecap="round"
        className="stroke-gray-900 dark:stroke-white/90"
      />
      <circle cx={CX} cy={CY} r={7} className="fill-gray-900 dark:fill-white/90" />
      <text
        x={CX}
        y={CY - 34}
        textAnchor="middle"
        className="fill-gray-900 text-4xl font-bold dark:fill-white/90"
      >
        {Math.round(value)}
      </text>
    </svg>
  );
}

function comparisonBadgeClass(score: number): string {
  const zone = zoneForScore(score);
  if (zone.name === "Neutral") return "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300";
  if (zone.name.includes("Fear")) return "ui-badge-error";
  return "ui-badge-success";
}

function ComparisonRow({ item }: { item: FngComparison }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-gray-200 py-3 last:border-b-0 dark:border-gray-800">
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white/90">{item.rating}</p>
      </div>
      <span className={cn("ui-badge shrink-0", comparisonBadgeClass(item.score))}>
        {Math.round(item.score)}
      </span>
    </div>
  );
}

function TimelineChart({ history }: { history: { date: string; score: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis
            dataKey="date"
            minTickGap={48}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) =>
              new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, {
                month: "short",
                year: "2-digit",
                timeZone: "UTC",
              })
            }
            className="text-xs"
          />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} className="text-xs" />
          <Tooltip
            formatter={(v) => [String(v ?? ""), "Index"]}
            labelFormatter={(label) => String(label)}
          />
          {[25, 45, 55, 75].map((y) => (
            <ReferenceLine key={y} y={y} strokeDasharray="4 4" className="stroke-gray-300 dark:stroke-gray-700" />
          ))}
          <Area
            type="monotone"
            dataKey="score"
            stroke="#465fff"
            strokeWidth={2}
            fill="#465fff"
            fillOpacity={0.1}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface FearGreedGaugeProps {
  title: string;
  description: string;
  endpoint: string;
}

export function FearGreedGauge({ title, description, endpoint }: FearGreedGaugeProps) {
  const { data, isLoading, error, refetch } = useFngDetail(endpoint);
  const [tab, setTab] = useState<"overview" | "timeline">("overview");

  const fetchFailed = Boolean(error && !data) || Boolean(data?.error);

  return (
    <section className="ui-card">
      <header className="ui-card-header">
        <div>
          <h2 className="ui-title">{title}</h2>
          <p className="ui-description">{description}</p>
        </div>
        {!fetchFailed && (
          <div
            role="tablist"
            aria-label={`${title} view`}
            className="flex rounded-full bg-gray-100 p-1 dark:bg-white/5"
          >
            {(["overview", "timeline"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-white text-gray-900 shadow-theme-xs dark:bg-white/10 dark:text-white/90"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="ui-card-body">
        {isLoading && !data ? (
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
        ) : fetchFailed ? (
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2 text-error-600 dark:text-error-500">
              <AlertCircle size={16} aria-hidden="true" />
              <p className="text-sm">{error ?? data?.error}</p>
            </div>
            <button type="button" onClick={refetch} className="ui-button ui-button-primary">
              Retry
            </button>
          </div>
        ) : data && data.value !== null ? (
          <>
            {tab === "overview" ? (
              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                <div className="flex flex-col items-center gap-2">
                  <Gauge value={data.value} label={title} />
                  <span
                    className={cn(
                      "ui-badge",
                      data.value >= 55
                        ? "ui-badge-success"
                        : data.value >= 45
                          ? "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"
                          : "ui-badge-error"
                    )}
                  >
                    {data.rating}
                  </span>
                </div>
                <div>
                  {data.comparisons.map((item) => (
                    <ComparisonRow key={item.label} item={item} />
                  ))}
                </div>
              </div>
            ) : (
              <TimelineChart history={data.history} />
            )}

            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Source: {data.source}
              {data.last_updated &&
                ` · Last updated ${new Date(data.last_updated).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
