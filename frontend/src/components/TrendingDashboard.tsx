"use client";

import { Activity, Flame, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useTrending } from "@/hooks/useTrending";
import { cn } from "@/lib/utils";
import { NewsFeed } from "./NewsFeed";
import { formatPrice } from "./QuoteCard";
import type { TrendingStock } from "@/types/trending";

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function ChangePill({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
  }
  const isUp = value >= 0;
  return (
    <span
      className={cn(
        "ui-badge",
        isUp ? "ui-badge-success" : "ui-badge-error",
      )}
    >
      {isUp ? (
        <TrendingUp size={12} aria-hidden="true" />
      ) : (
        <TrendingDown size={12} aria-hidden="true" />
      )}
      {isUp ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function StockRow({
  stock,
  rank,
  showVolume,
}: {
  stock: TrendingStock;
  rank: number;
  showVolume?: boolean;
}) {
  return (
    <li>
      <div className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
        <span className="w-5 shrink-0 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {stock.symbol}
            <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
              {stock.name}
            </span>
          </p>
          {showVolume && stock.volume !== null && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Vol {compactNumber.format(stock.volume)}
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-gray-800 dark:text-white/90">
          {formatPrice(stock.price)}
        </span>
        <ChangePill value={stock.change_percent} />
      </div>
    </li>
  );
}

function TrendingCard({
  title,
  description,
  icon: Icon,
  stocks,
  showVolume,
}: {
  title: string;
  description: string;
  icon: typeof Flame;
  stocks: TrendingStock[];
  showVolume?: boolean;
}) {
  return (
    <section className="ui-card">
      <header className="ui-card-header">
        <div className="flex items-center gap-3">
          <span className="ui-icon-box h-10 w-10">
            <Icon size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="ui-title">{title}</h2>
            <p className="ui-description">{description}</p>
          </div>
        </div>
      </header>
      <div className="ui-card-body pt-2">
        {stocks.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            No data available
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {stocks.map((stock, index) => (
              <StockRow
                key={stock.symbol}
                stock={stock}
                rank={index + 1}
                showVolume={showVolume}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
  );
}

export function TrendingDashboard() {
  const { data, isLoading, error, refetch } = useTrending();

  const newsSymbols = data
    ? Array.from(
        new Set(
          [...data.most_active, ...data.gainers]
            .slice(0, 5)
            .map((stock) => stock.symbol),
        ),
      )
    : [];

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex items-center justify-end">
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
        <div className="flex flex-col gap-4 md:gap-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : data ? (
        <>
          <TrendingCard
            title="Most Active"
            description="Highest trading volume today"
            icon={Activity}
            stocks={data.most_active}
            showVolume
          />
          <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
            <TrendingCard
              title="Top Gainers"
              description="Biggest movers up today"
              icon={TrendingUp}
              stocks={data.gainers}
            />
            <TrendingCard
              title="Top Losers"
              description="Biggest movers down today"
              icon={TrendingDown}
              stocks={data.losers}
            />
          </div>

          <NewsFeed symbols={newsSymbols} />
        </>
      ) : null}
    </div>
  );
}
