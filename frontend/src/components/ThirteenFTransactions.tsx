"use client";

import { ArrowDownRight, ArrowUpRight, MinusCircle, PlusCircle } from "lucide-react";
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

export function TransactionsSummary({ transactions }: { transactions: Transaction[] }) {
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
