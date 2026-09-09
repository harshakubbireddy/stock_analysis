"use client";

import {
  ArrowLeftRight,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useCongressTrades } from "@/hooks/useCongressTrades";
import { cn } from "@/lib/utils";
import type { CongressTrade } from "@/types/congress";

const OWNER_LABELS: Record<string, string> = {
  SP: "Spouse",
  JT: "Joint",
  DC: "Child",
};

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

function daysFromNow(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - target.getTime();
  return Math.round(diffMs / 86_400_000);
}

function DaysBadge({ date }: { date: string | null }) {
  const days = daysFromNow(date);
  if (days === null) {
    return null;
  }
  let label: string;
  let badgeClass: string;
  if (days === 0) {
    label = "Today";
    badgeClass = "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300";
  } else if (days > 0) {
    label = `${days}d ago`;
    badgeClass =
      days <= 7
        ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";
  } else {
    label = `in ${Math.abs(days)}d`;
    badgeClass = "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  }
  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badgeClass,
      )}
    >
      {label}
    </span>
  );
}

const TX_CONFIG: Record<
  string,
  {
    label: string;
    icon: typeof TrendingUp;
    badgeClass: string;
    accentClass: string;
    textClass: string;
  }
> = {
  purchase: {
    label: "Purchase",
    icon: TrendingUp,
    badgeClass: "ui-badge ui-badge-success",
    accentClass: "bg-success-500",
    textClass: "text-success-600 dark:text-success-500",
  },
  sale: {
    label: "Sale",
    icon: TrendingDown,
    badgeClass: "ui-badge ui-badge-error",
    accentClass: "bg-error-500",
    textClass: "text-error-600 dark:text-error-500",
  },
  sale_partial: {
    label: "Sale (Partial)",
    icon: TrendingDown,
    badgeClass: "ui-badge ui-badge-error",
    accentClass: "bg-error-500",
    textClass: "text-error-600 dark:text-error-500",
  },
  exchange: {
    label: "Exchange",
    icon: ArrowLeftRight,
    badgeClass: "ui-badge ui-badge-warning",
    accentClass: "bg-warning-500",
    textClass: "text-warning-600 dark:text-warning-500",
  },
};

function TransactionBadge({ type }: { type: string }) {
  const config = TX_CONFIG[type] ?? {
    label: type,
    icon: ArrowLeftRight,
    badgeClass: "ui-badge ui-badge-warning",
  };
  const Icon = config.icon;
  return (
    <span className={cn(config.badgeClass, "text-sm")}>
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function cleanAssetName(asset: string): string {
  return asset
    .replace(/\s*\([A-Z][A-Z.]{0,9}\)\s*\[[A-Z]+\]\s*$/, "")
    .replace(/\s*\[[A-Z]+\]\s*$/, "")
    .trim();
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

function SummaryStatCard({
  label,
  count,
  icon: Icon,
  accentClass,
}: {
  label: string;
  count: number;
  icon: typeof TrendingUp;
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
        </p>
      </div>
    </div>
  );
}

function TradeCard({ trade }: { trade: CongressTrade }) {
  const owner = trade.owner
    ? (OWNER_LABELS[trade.owner] ?? trade.owner)
    : "Self";
  const securityName = cleanAssetName(trade.asset);
  return (
    <div className="ui-card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-gray-800 dark:text-white/90">
              {securityName || trade.ticker || "—"}
            </p>
            {trade.ticker && (
              <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {trade.ticker}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-400 dark:text-gray-500">
            {trade.description ?? trade.asset}
          </p>
        </div>
        <TransactionBadge type={trade.transaction_type} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Amount</span>
        <span className="font-medium text-gray-800 dark:text-white/90">
          {trade.amount_label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Owner</span>
        <span className="font-medium text-gray-800 dark:text-white/90">
          {owner}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Trade date</span>
        <span className="flex items-center font-medium text-gray-800 dark:text-white/90">
          {formatDate(trade.transaction_date)}
          <DaysBadge date={trade.transaction_date} />
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 dark:text-gray-500">Disclosed</span>
        <span className="flex items-center font-medium text-gray-800 dark:text-white/90">
          {formatDate(trade.filing_date)}
          <DaysBadge date={trade.filing_date} />
        </span>
      </div>

      <a
        href={trade.pdf_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-300"
      >
        <ExternalLink size={16} aria-hidden="true" />
        View filing
      </a>
    </div>
  );
}

export function CongressTradesPanel() {
  const {
    traders,
    selectedName,
    selectTrader,
    data,
    isLoadingTraders,
    isLoading,
    error,
    refetch,
  } = useCongressTrades();

  const groups: Record<string, CongressTrade[]> = {
    purchase: [],
    sale: [],
    sale_partial: [],
    exchange: [],
  };
  if (data) {
    for (const trade of data.trades) {
      (groups[trade.transaction_type] ?? (groups[trade.transaction_type] = [])).push(trade);
    }
  }

  const stats = [
    {
      label: "Purchases",
      key: "purchase" as const,
      icon: TrendingUp,
      accentClass: "bg-success-500",
    },
    {
      label: "Sales",
      key: "sale" as const,
      icon: TrendingDown,
      accentClass: "bg-error-500",
    },
    {
      label: "Partial Sales",
      key: "sale_partial" as const,
      icon: TrendingDown,
      accentClass: "bg-error-500",
    },
    {
      label: "Exchanges",
      key: "exchange" as const,
      icon: ArrowLeftRight,
      accentClass: "bg-warning-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {isLoadingTraders ? (
        <SkeletonBlock className="h-12" />
      ) : (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Select a member of Congress"
        >
          {traders.map((trader) => {
            const isActive = trader.last_name === selectedName;
            return (
              <button
                key={trader.last_name}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTrader(trader.last_name)}
                className={cn(
                  "shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
                )}
              >
                {trader.name}
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
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-96" />
        </>
      ) : data ? (
        <>
          <section className="ui-card">
            <div className="ui-card-header">
              <div className="flex items-center gap-3">
                <span className="ui-icon-box h-10 w-10">
                  <UserRound size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="ui-title">{data.filer}</h2>
                  <p className="ui-description">
                    {data.trades.length} disclosed trades from recent Periodic
                    Transaction Reports
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
          </section>

          {data.trades.length === 0 ? (
            <div className="ui-card p-6">
              <p className="py-6 text-center text-base text-gray-400 dark:text-gray-500">
                No parseable trades found. Some filings are scanned PDFs that
                cannot be read automatically.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                  const items = groups[stat.key] ?? [];
                  return (
                    <SummaryStatCard
                      key={stat.key}
                      label={stat.label}
                      count={items.length}
                      icon={stat.icon}
                      accentClass={stat.accentClass}
                    />
                  );
                })}
              </div>

              {stats.map((stat) => {
                const items = groups[stat.key] ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={stat.key} className="flex flex-col gap-4">
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
                      {items.map((trade, index) => (
                        <TradeCard
                          key={`${trade.pdf_url}-${index}`}
                          trade={trade}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <p className="text-sm text-gray-400 dark:text-gray-500">
            Source: U.S. House Clerk Periodic Transaction Reports (STOCK Act).
            Trades can be disclosed up to 45 days after execution and amounts
            are reported as ranges.
          </p>
        </>
      ) : null}
    </div>
  );
}
