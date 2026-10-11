"use client";

import { useState } from "react";
import type { FinancialMetric, StockFinancialPeriod, StockFinancials } from "@/types/stockAnalysis";
import { LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatCard } from "./ChatCard";
import { fmtBigMoney, fmtCompact, fmtNum, fmtPct } from "./formatters";

type View = "annual" | "quarterly";

type Row = {
  label: string;
  key: FinancialMetric;
  fmt: (value: number | null) => string;
  /** Lower is better (debt, liabilities, capex) — flips growth colouring. */
  inverse?: boolean;
};

type Section = { title: string; rows: Row[] };

const SECTIONS: Section[] = [
  {
    title: "Income Statement",
    rows: [
      { label: "Revenue", key: "revenue", fmt: fmtBigMoney },
      { label: "Gross Profit", key: "gross_profit", fmt: fmtBigMoney },
      { label: "Operating Income", key: "operating_income", fmt: fmtBigMoney },
      { label: "Net Income", key: "net_income", fmt: fmtBigMoney },
      { label: "EBITDA", key: "ebitda", fmt: fmtBigMoney },
      { label: "EPS", key: "eps", fmt: fmtNum },
      { label: "R&D", key: "rd", fmt: fmtBigMoney },
    ],
  },
  {
    title: "Balance Sheet",
    rows: [
      { label: "Cash", key: "cash", fmt: fmtBigMoney },
      { label: "Total Debt", key: "total_debt", fmt: fmtBigMoney, inverse: true },
      { label: "Stockholders Equity", key: "stockholders_equity", fmt: fmtBigMoney },
      { label: "Total Assets", key: "total_assets", fmt: fmtBigMoney },
      { label: "Current Assets", key: "current_assets", fmt: fmtBigMoney },
      { label: "Current Liabilities", key: "current_liabilities", fmt: fmtBigMoney, inverse: true },
    ],
  },
  {
    title: "Cash Flow",
    rows: [
      { label: "Operating CF", key: "operating_cashflow", fmt: fmtBigMoney },
      { label: "CapEx", key: "capex", fmt: fmtBigMoney, inverse: true },
      { label: "Free Cash Flow", key: "free_cashflow", fmt: fmtBigMoney },
      { label: "Buybacks", key: "buybacks", fmt: fmtBigMoney },
    ],
  },
];

const MARGINS: { label: string; num: FinancialMetric }[] = [
  { label: "Gross", num: "gross_profit" },
  { label: "Operating", num: "operating_income" },
  { label: "Net", num: "net_income" },
];

// --- helpers ---------------------------------------------------------------

/** Oldest → newest so charts and tables read left-to-right in time. */
function sortChrono(periods: StockFinancialPeriod[]): StockFinancialPeriod[] {
  return [...periods].sort((a, b) => a.period.localeCompare(b.period));
}

function periodLabel(period: string, view: View): string {
  const [year, month] = period.split("-");
  if (view === "annual" || !month) return `FY${year}`;
  const q = Math.ceil(Number(month) / 3);
  return `Q${q}'${year.slice(2)}`;
}

/** % change vs the previous period; null when not meaningful (missing or prior ≤ 0). */
function growth(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

function margin(p: StockFinancialPeriod, num: FinancialMetric): number | null {
  const n = p[num];
  const rev = p.revenue;
  if (n == null || rev == null || rev <= 0) return null;
  return (n / rev) * 100;
}

function growthClass(g: number | null, inverse = false): string {
  if (g == null) return "text-gray-400";
  const good = inverse ? g <= 0 : g >= 0;
  return good ? "text-success-600 dark:text-success-500" : "text-error-600 dark:text-error-500";
}

function fmtGrowth(g: number | null): string {
  if (g == null) return "—";
  return `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
}

function GrowthBadge({ g, inverse = false }: { g: number | null; inverse?: boolean }) {
  if (g == null) return null;
  const good = inverse ? g <= 0 : g >= 0;
  const Icon = g >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn("ui-badge gap-1", good ? "ui-badge-success" : "ui-badge-error")}>
      <Icon size={12} aria-hidden="true" />
      {fmtGrowth(g)}
    </span>
  );
}

// --- KPI strip -------------------------------------------------------------

function KpiStrip({ periods, view }: { periods: StockFinancialPeriod[]; view: View }) {
  const latest = periods[periods.length - 1];
  const prev = periods.length > 1 ? periods[periods.length - 2] : undefined;
  if (!latest) return null;

  const kpis: { label: string; key: FinancialMetric; fmt: (v: number | null) => string }[] = [
    { label: "Revenue", key: "revenue", fmt: fmtBigMoney },
    { label: "Net Income", key: "net_income", fmt: fmtBigMoney },
    { label: "Free Cash Flow", key: "free_cashflow", fmt: fmtBigMoney },
    { label: "EPS", key: "eps", fmt: fmtNum },
  ];
  const vsLabel = view === "annual" ? "YoY" : "QoQ";

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => {
        const v = latest[k.key];
        const g = growth(v, prev?.[k.key]);
        return (
          <div key={k.key} className="ui-tile min-w-0">
            <p className="ui-label truncate">{k.label}</p>
            <p
              className={cn(
                "mt-1 truncate text-lg font-semibold tabular-nums",
                v != null && v < 0 ? "text-error-600 dark:text-error-500" : "text-gray-900 dark:text-white/90",
              )}
            >
              {k.fmt(v)}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="ui-caption truncate">{periodLabel(latest.period, view)}</span>
              {g != null ? (
                <span className={cn("text-xs font-medium tabular-nums", growthClass(g))}>
                  {fmtGrowth(g)} {vsLabel}
                </span>
              ) : (
                <span className="ui-caption">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Bar chart -------------------------------------------------------------

function FinancialBarChart({
  periods,
  field,
  label,
  color,
  view,
}: {
  periods: StockFinancialPeriod[];
  field: FinancialMetric;
  label: string;
  color: string;
  view: View;
}) {
  const valid = periods.filter((p) => p[field] != null);
  if (valid.length === 0) return null;
  const values = valid.map((p) => p[field] as number);
  const max = Math.max(...values.map(Math.abs));
  const hasNegative = Math.min(...values) < 0;
  const latest = valid[valid.length - 1];
  const prev = valid.length > 1 ? valid[valid.length - 2] : undefined;
  const latestGrowth = growth(latest[field], prev?.[field]);

  return (
    <div className="ui-tile">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="ui-label truncate">{label}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white/90">
            {fmtBigMoney(latest[field])}
          </p>
        </div>
        <GrowthBadge g={latestGrowth} />
      </div>
      <div className="flex items-end gap-2" style={{ height: "128px" }}>
        {valid.map((p, i) => {
          const val = p[field] as number;
          const heightPct = max > 0 ? (Math.abs(val) / max) * 100 : 0;
          const isNeg = val < 0;
          const isLatest = i === valid.length - 1;
          const g = i > 0 ? growth(val, valid[i - 1][field]) : null;
          return (
            <div key={p.period} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">
                {isNeg ? "-" : ""}{fmtCompact(Math.abs(val))}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-md transition-opacity",
                  isNeg ? "bg-error-500" : color,
                  isLatest ? "opacity-100" : "opacity-60",
                )}
                style={{ height: `${heightPct}%`, minHeight: "3px" }}
                title={`${periodLabel(p.period, view)}: ${isNeg ? "-" : ""}$${fmtCompact(Math.abs(val))}`}
              />
              <span
                className={cn(
                  "mt-1.5 text-[11px] tabular-nums",
                  isLatest ? "font-semibold text-gray-800 dark:text-white/90" : "text-gray-500 dark:text-gray-400",
                )}
              >
                {periodLabel(p.period, view)}
              </span>
              <span className={cn("text-[10px] tabular-nums", growthClass(g))}>
                {g != null ? fmtGrowth(g) : "\u00A0"}
              </span>
            </div>
          );
        })}
      </div>
      {hasNegative && <p className="ui-caption mt-2">Red bars = negative</p>}
    </div>
  );
}

// --- Margins tile ----------------------------------------------------------

function MarginsTile({ periods, view }: { periods: StockFinancialPeriod[]; view: View }) {
  const rows = MARGINS.map((m) => ({
    ...m,
    values: periods.map((p) => margin(p, m.num)),
  })).filter((r) => r.values.some((v) => v != null));
  if (rows.length === 0) return null;

  return (
    <div className="ui-tile">
      <p className="ui-label mb-3">Margins</p>
      <div className="space-y-3">
        {rows.map((r) => {
          const latest = r.values[r.values.length - 1];
          const prev = r.values.length > 1 ? r.values[r.values.length - 2] : null;
          const delta = latest != null && prev != null ? latest - prev : null;
          const width = latest != null ? Math.max(0, Math.min(100, latest)) : 0;
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="font-semibold text-gray-900 dark:text-white/90">{fmtPct(latest, 1)}</span>
                  {delta != null && (
                    <span className={growthClass(delta)}>
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)} pts
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                <div
                  className={cn("h-full rounded-full", latest != null && latest < 0 ? "bg-error-500" : "bg-brand-500")}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-gray-400">
                {r.values.map((v, i) => (
                  <span key={periods[i].period}>
                    {periodLabel(periods[i].period, view)} {fmtPct(v, 0)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Table -----------------------------------------------------------------

function FinancialsTable({ periods, view }: { periods: StockFinancialPeriod[]; view: View }) {
  if (periods.length === 0) return null;
  const lastIdx = periods.length - 1;
  const vsLabel = view === "annual" ? "YoY" : "QoQ";

  return (
    <div className="ui-table-wrap overflow-x-auto">
      <table className="ui-table">
        <thead>
          <tr>
            <th className="text-left">Metric</th>
            {periods.map((p, i) => (
              <th
                key={p.period}
                className={cn("text-right", i === lastIdx && "bg-brand-50/60 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300")}
              >
                {periodLabel(p.period, view)}
              </th>
            ))}
            <th className="text-right">{vsLabel}</th>
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((section) => {
            const rows = section.rows.filter((row) => periods.some((p) => p[row.key] != null));
            if (rows.length === 0) return null;
            return (
              <SectionRows key={section.title} section={{ ...section, rows }} periods={periods} lastIdx={lastIdx} />
            );
          })}
          <tr>
            <td colSpan={periods.length + 2} className="bg-gray-50 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
              Margins
            </td>
          </tr>
          {MARGINS.map((m) => {
            const vals = periods.map((p) => margin(p, m.num));
            if (vals.every((v) => v == null)) return null;
            const latest = vals[lastIdx];
            const prev = lastIdx > 0 ? vals[lastIdx - 1] : null;
            const delta = latest != null && prev != null ? latest - prev : null;
            return (
              <tr key={m.label}>
                <td className="font-medium text-gray-800 dark:text-white/90">{m.label} Margin</td>
                {vals.map((v, i) => (
                  <td
                    key={periods[i].period}
                    className={cn(
                      "text-right tabular-nums",
                      v != null && v < 0 ? "text-error-600 dark:text-error-500" : "text-gray-600 dark:text-gray-300",
                      i === lastIdx && "bg-brand-50/60 font-semibold dark:bg-brand-500/10",
                    )}
                  >
                    {fmtPct(v, 1)}
                  </td>
                ))}
                <td className={cn("text-right text-xs font-medium tabular-nums", growthClass(delta))}>
                  {delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionRows({
  section,
  periods,
  lastIdx,
}: {
  section: Section;
  periods: StockFinancialPeriod[];
  lastIdx: number;
}) {
  return (
    <>
      <tr>
        <td colSpan={periods.length + 2} className="bg-gray-50 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
          {section.title}
        </td>
      </tr>
      {section.rows.map((row) => {
        const latest = periods[lastIdx][row.key];
        const prev = lastIdx > 0 ? periods[lastIdx - 1][row.key] : null;
        const g = growth(latest, prev);
        return (
          <tr key={row.key}>
            <td className="font-medium text-gray-800 dark:text-white/90">{row.label}</td>
            {periods.map((p, i) => {
              const v = p[row.key];
              return (
                <td
                  key={p.period}
                  className={cn(
                    "text-right tabular-nums",
                    v != null && v < 0 ? "text-error-600 dark:text-error-500" : "text-gray-600 dark:text-gray-300",
                    i === lastIdx && "bg-brand-50/60 font-semibold dark:bg-brand-500/10",
                  )}
                >
                  {v != null ? row.fmt(v) : "—"}
                </td>
              );
            })}
            <td className={cn("text-right text-xs font-medium tabular-nums", growthClass(g, row.inverse))}>
              {fmtGrowth(g)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// --- Section ---------------------------------------------------------------

export function FinancialsSection({ financials }: { financials: StockFinancials }) {
  const [view, setView] = useState<View>("annual");
  const periods = sortChrono(view === "annual" ? financials.annual : financials.quarterly);
  if (financials.annual.length === 0 && financials.quarterly.length === 0) return null;

  const views: View[] = ["annual", "quarterly"];
  const first = periods[0];
  const last = periods[periods.length - 1];
  const range = first && last && first !== last
    ? `${periodLabel(first.period, view)} – ${periodLabel(last.period, view)}`
    : last ? periodLabel(last.period, view) : undefined;

  return (
    <ChatCard
      title="Financials"
      icon={LineChart}
      description={range ? `${range} · income statement, balance sheet and cash flow` : "Income statement, balance sheet and cash flow"}
      aside={
        <div role="tablist" aria-label="Financials period" className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                view === v
                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white/90"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      }
    >
      {periods.length === 0 ? (
        <p className="ui-caption">No {view} data available</p>
      ) : (
        <>
          <KpiStrip periods={periods} view={view} />

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <FinancialBarChart periods={periods} field="revenue" label="Revenue" color="bg-brand-500" view={view} />
            <FinancialBarChart periods={periods} field="net_income" label="Net Income" color="bg-success-500" view={view} />
            <FinancialBarChart periods={periods} field="free_cashflow" label="Free Cash Flow" color="bg-brand-300" view={view} />
            <MarginsTile periods={periods} view={view} />
          </div>

          <FinancialsTable periods={periods} view={view} />
        </>
      )}
    </ChatCard>
  );
}
