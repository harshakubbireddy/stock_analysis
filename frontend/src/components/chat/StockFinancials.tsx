"use client";

import { useState } from "react";
import type { FinancialMetric, StockFinancialPeriod, StockFinancials } from "@/types/stockAnalysis";
import { LineChart } from "lucide-react";
import { ChatCard } from "./ChatCard";
import { fmtBigMoney, fmtCompact, fmtNum } from "./formatters";

const FINANCIAL_ROWS: {
  label: string;
  key: FinancialMetric;
  fmt: (value: number | null) => string;
}[] = [
  { label: "Revenue", key: "revenue", fmt: fmtBigMoney },
  { label: "Gross Profit", key: "gross_profit", fmt: fmtBigMoney },
  { label: "Operating Income", key: "operating_income", fmt: fmtBigMoney },
  { label: "Net Income", key: "net_income", fmt: fmtBigMoney },
  { label: "EBITDA", key: "ebitda", fmt: fmtBigMoney },
  { label: "EPS", key: "eps", fmt: fmtNum },
  { label: "R&D", key: "rd", fmt: fmtBigMoney },
  { label: "Total Debt", key: "total_debt", fmt: fmtBigMoney },
  { label: "Stockholders Equity", key: "stockholders_equity", fmt: fmtBigMoney },
  { label: "Total Assets", key: "total_assets", fmt: fmtBigMoney },
  { label: "Current Assets", key: "current_assets", fmt: fmtBigMoney },
  { label: "Current Liabilities", key: "current_liabilities", fmt: fmtBigMoney },
  { label: "Cash", key: "cash", fmt: fmtBigMoney },
  { label: "Free Cash Flow", key: "free_cashflow", fmt: fmtBigMoney },
  { label: "Operating CF", key: "operating_cashflow", fmt: fmtBigMoney },
  { label: "CapEx", key: "capex", fmt: fmtBigMoney },
  { label: "Buybacks", key: "buybacks", fmt: fmtBigMoney },
];

function FinancialBarChart({
  periods,
  field,
  label,
  color,
}: {
  periods: StockFinancialPeriod[];
  field: FinancialMetric;
  label: string;
  color: string;
}) {
  const valid = periods.filter((p) => p[field] != null);
  if (valid.length === 0) return null;
  const values = valid.map((p) => p[field] as number);
  const max = Math.max(...values.map(Math.abs));
  const min = Math.min(...values);
  const hasNegative = min < 0;

  return (
    <div className="ui-tile">
      <p className="ui-label mb-3">{label}</p>
      <div className="flex items-end gap-2" style={{ height: "128px" }}>
        {valid.map((p, i) => {
          const val = p[field] as number;
          const heightPct = max > 0 ? (Math.abs(val) / max) * 100 : 0;
          const isNeg = val < 0;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-xs font-medium tabular-nums text-gray-600 dark:text-gray-400">
                {fmtCompact(Math.abs(val))}
              </span>
              <div
                className={`w-full rounded-t-md ${isNeg ? "bg-error-500" : color}`}
                style={{ height: `${heightPct}%`, minHeight: "3px" }}
                title={`${p.period}: ${isNeg ? "-" : ""}$${fmtCompact(Math.abs(val))}`}
              />
              <span className="ui-caption mt-1.5 tabular-nums">
                {p.period.split("-")[0]}
              </span>
            </div>
          );
        })}
      </div>
      {hasNegative && <p className="ui-caption mt-2">Red bars = negative</p>}
    </div>
  );
}

function FinancialsTable({ periods }: { periods: StockFinancialPeriod[] }) {
  if (periods.length === 0) return null;
  return (
    <div className="ui-table-wrap overflow-x-auto">
      <table className="ui-table">
        <thead>
          <tr>
            <th className="text-left">Metric</th>
            {periods.map((p) => (
              <th key={p.period} className="text-right">{p.period.split("-")[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FINANCIAL_ROWS.map((row) => (
            <tr key={row.key}>
              <td className="font-medium text-gray-800 dark:text-white/90">{row.label}</td>
              {periods.map((p) => {
                const v = p[row.key];
                return (
                  <td
                    key={p.period}
                    className={`text-right ${v != null && v < 0 ? "text-error-600 dark:text-error-500" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    {v != null ? row.fmt(v) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinancialsSection({ financials }: { financials: StockFinancials }) {
  const [view, setView] = useState<"annual" | "quarterly">("annual");
  const periods = view === "annual" ? financials.annual : financials.quarterly;
  if (financials.annual.length === 0 && financials.quarterly.length === 0) return null;

  const views = ["annual", "quarterly"] as const;

  return (
    <ChatCard
      title="Financials"
      icon={LineChart}
      description="Income statement, balance sheet and cash flow"
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
      {/* Bar charts */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <FinancialBarChart periods={periods} field="revenue" label="Revenue" color="bg-brand-500" />
        <FinancialBarChart periods={periods} field="net_income" label="Net Income" color="bg-success-500" />
        <FinancialBarChart periods={periods} field="free_cashflow" label="Free Cash Flow" color="bg-brand-300" />
      </div>

      {/* Full table */}
      <FinancialsTable periods={periods} />
    </ChatCard>
  );
}
