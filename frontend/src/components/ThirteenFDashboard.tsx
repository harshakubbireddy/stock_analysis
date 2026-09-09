"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Landmark,
  MinusCircle,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { useThirteenF } from "@/hooks/useThirteenF";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/thirteenf";

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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

const ACTION_CONFIG: Record<
  Transaction["action"],
  {
    label: string;
    icon: typeof PlusCircle;
    badgeClass: string;
    dotClass: string;
    textClass: string;
  }
> = {
  new_buy: {
    label: "New Buy",
    icon: PlusCircle,
    badgeClass: "ui-badge ui-badge-success",
    dotClass: "bg-success-500",
    textClass: "text-success-600 dark:text-success-500",
  },
  add: {
    label: "Added",
    icon: ArrowUpRight,
    badgeClass: "ui-badge ui-badge-success",
    dotClass: "bg-success-500",
    textClass: "text-success-600 dark:text-success-500",
  },
  trim: {
    label: "Trimmed",
    icon: ArrowDownRight,
    badgeClass: "ui-badge ui-badge-error",
    dotClass: "bg-error-500",
    textClass: "text-error-600 dark:text-error-500",
  },
  exit: {
    label: "Exited",
    icon: MinusCircle,
    badgeClass: "ui-badge ui-badge-error",
    dotClass: "bg-error-500",
    textClass: "text-error-600 dark:text-error-500",
  },
};

function ActionBadge({ action }: { action: Transaction["action"] }) {
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  return (
    <span className={cn(config.badgeClass, "text-sm")}>
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
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

// --- Summary + Cards ---

function SummaryStatCard({
  label,
  count,
  totalValue,
  icon: Icon,
  accentClass,
}: {
  label: string;
  count: number;
  totalValue: number;
  icon: typeof PlusCircle;
  accentClass: string;
}) {
  return (
    <div className="ui-card flex items-center gap-4 p-5">
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          accentClass,
        )}
      >
        <Icon size={22} className="text-white" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white/90">
          {count}
          <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">
            {compactCurrency.format(totalValue)}
          </span>
        </p>
      </div>
    </div>
  );
}

function TransactionCard({ tx }: { tx: Transaction }) {
  const config = ACTION_CONFIG[tx.action];
  return (
    <div className="ui-card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-base font-semibold text-gray-800 dark:text-white/90">
          {tx.issuer}
        </p>
        <ActionBadge action={tx.action} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Shares</span>
        <span className={cn("font-medium", config.textClass)}>
          {tx.shares_change > 0 ? "+" : ""}
          {compactNumber.format(tx.shares_change)}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Value change</span>
        <span className={cn("font-medium", config.textClass)}>
          {tx.value_change > 0 ? "+" : ""}
          {compactCurrency.format(tx.value_change)}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Latest position</span>
        <span className="font-medium text-gray-800 dark:text-white/90">
          {compactCurrency.format(tx.value_latest)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
          role="img"
          aria-label={`${tx.pct_of_portfolio}% of portfolio`}
        >
          <div
            className="h-full rounded-full bg-brand-500"
            style={{ width: `${Math.min(tx.pct_of_portfolio, 100)}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {tx.pct_of_portfolio.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function TransactionsSummary({ transactions }: { transactions: Transaction[] }) {
  const groups: Record<Transaction["action"], Transaction[]> = {
    new_buy: [],
    add: [],
    trim: [],
    exit: [],
  };
  for (const tx of transactions) {
    groups[tx.action].push(tx);
  }

  const stats = [
    {
      label: "New Buys",
      action: "new_buy" as const,
      icon: PlusCircle,
      accentClass: "bg-success-500",
    },
    {
      label: "Added",
      action: "add" as const,
      icon: ArrowUpRight,
      accentClass: "bg-success-500",
    },
    {
      label: "Trimmed",
      action: "trim" as const,
      icon: ArrowDownRight,
      accentClass: "bg-error-500",
    },
    {
      label: "Exited",
      action: "exit" as const,
      icon: MinusCircle,
      accentClass: "bg-error-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const items = groups[stat.action];
          return (
            <SummaryStatCard
              key={stat.action}
              label={stat.label}
              count={items.length}
              totalValue={items.reduce((sum, tx) => sum + Math.abs(tx.value_change), 0)}
              icon={stat.icon}
              accentClass={stat.accentClass}
            />
          );
        })}
      </div>

      {stats.map((stat) => {
        const items = groups[stat.action];
        if (items.length === 0) return null;
        return (
          <div key={stat.action} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <stat.icon size={20} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {stat.label}
              </h3>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((tx) => (
                <TransactionCard key={`${tx.cusip}-${tx.action}`} tx={tx} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
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
