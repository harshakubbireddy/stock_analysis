"use client";

import { CalendarDays, Landmark, RefreshCw } from "lucide-react";
import { useThirteenF } from "@/hooks/useThirteenF";
import { cn } from "@/lib/utils";
import { TransactionsSummary } from "./ThirteenFTransactions";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5",
        className,
      )}
    />
  );
}

// --- Main dashboard ---

export function ThirteenFDashboard() {
  const {
    funds,
    selectedCik,
    selectFund,
    data,
    isLoadingFunds,
    isLoading,
    error,
    refetch,
  } = useThirteenF();

  return (
    <div className="flex flex-col gap-6">
      {isLoadingFunds ? (
        <SkeletonBlock className="h-12" />
      ) : (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Select a fund"
        >
          {funds.map((fund) => {
            const isActive = fund.cik === selectedCik;
            return (
              <button
                key={fund.cik}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectFund(fund.cik)}
                className={cn(
                  "shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
                )}
              >
                {fund.name}
              </button>
            );
          })}
        </div>
      )}

      {error && !data ? (
        <div className="ui-card flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-error-600 dark:text-error-500">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="ui-button ui-button-primary"
          >
            Retry
          </button>
        </div>
      ) : isLoading && !data ? (
        <>
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-96" />
        </>
      ) : data ? (
        <>
          <section className="ui-card">
            <div className="ui-card-header">
              <div className="flex items-center gap-3">
                <span className="ui-icon-box h-10 w-10">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="ui-title">{data.fund_name}</h2>
                  <p className="ui-description">
                    Quarter-over-quarter changes from SEC EDGAR 13F filings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={refetch}
                disabled={isLoading}
                className="ui-button ui-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  aria-hidden="true"
                  className={cn(isLoading && "animate-spin")}
                />
                Refresh
              </button>
            </div>
            <div className="ui-card-body">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <CalendarDays
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-gray-400 dark:text-gray-500"
                  />
                  <div>
                    <dt className="text-sm text-gray-400 dark:text-gray-500">
                      Latest filing ({formatDate(data.latest_period)})
                    </dt>
                    <dd className="text-base font-medium text-gray-800 dark:text-white/90">
                      {formatDate(data.latest_filing_date)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-gray-400 dark:text-gray-500"
                  />
                  <div>
                    <dt className="text-sm text-gray-400 dark:text-gray-500">
                      Prior filing ({formatDate(data.prev_period)})
                    </dt>
                    <dd className="text-base font-medium text-gray-800 dark:text-white/90">
                      {formatDate(data.prev_filing_date)}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </section>

          {data.transactions.length === 0 ? (
            <div className="ui-card p-6">
              <p className="py-6 text-center text-base text-gray-400 dark:text-gray-500">
                No position changes detected between these two filings.
              </p>
            </div>
          ) : (
            <TransactionsSummary transactions={data.transactions} />
          )}

          <p className="text-sm text-gray-400 dark:text-gray-500">
            Source: SEC EDGAR 13F-HR filings. Changes are inferred by comparing
            two consecutive quarterly snapshots — actual trade timing and prices
            are not reported.
          </p>
        </>
      ) : null}
    </div>
  );
}
