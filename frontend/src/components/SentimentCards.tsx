"use client";

import { AlertCircle } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useSentiment } from "@/hooks/useSentiment";
import type { SentimentCard as SentimentCardType } from "@/types/sentiment";

function ratingBadgeClass(card: SentimentCardType): string {
  if (card.error || card.value === null) {
    return "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400";
  }

  const isVix = card.label.toLowerCase().includes("vix");
  const value = card.value;

  if (isVix) {
    if (value < 15) return "ui-badge-success";
    if (value < 20) return "ui-badge-success";
    if (value < 30) return "ui-badge-warning";
    return "ui-badge-error";
  }

  if (value >= 75) return "ui-badge-success";
  if (value >= 55) return "ui-badge-success";
  if (value >= 45) return "ui-badge-warning";
  if (value >= 25) return "ui-badge-warning";
  return "ui-badge-error";
}

function lineColorForCard(card: SentimentCardType): string {
  if (card.error || card.value === null) return "#9ca3af";
  const isVix = card.label.toLowerCase().includes("vix");
  const value = card.value;

  if (isVix) {
    if (value < 20) return "#12b76a";
    if (value < 30) return "#f79009";
    return "#f04438";
  }

  if (value >= 55) return "#12b76a";
  if (value >= 45) return "#f79009";
  return "#f04438";
}

function SentimentCardItem({ card }: { card: SentimentCardType }) {
  const hasError = Boolean(card.error);
  const data = card.history.map((point, index) => ({ index, value: point.score }));
  const values = card.history.map((point) => point.score);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const pad = (max - min) * 0.05 || 1;
  const lineColor = lineColorForCard(card);
  const isVix = card.label.toLowerCase().includes("vix");

  return (
    <article className="ui-card flex flex-col gap-3 p-5 md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="ui-title text-base">{card.label}</h3>
          <p className="ui-description text-xs">Source: {card.source}</p>
        </div>
        <span className={cn("ui-badge shrink-0", ratingBadgeClass(card))}>
          {card.rating}
        </span>
      </div>

      {hasError ? (
        <div className="flex items-center gap-2 rounded-lg bg-error-50 px-3 py-2 dark:bg-error-500/10">
          <AlertCircle size={16} className="text-error-600 dark:text-error-500" />
          <p className="text-xs text-error-600 dark:text-error-500">{card.error}</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white/90">
              {card.value !== null ? card.value.toFixed(isVix ? 2 : 1) : "—"}
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {isVix ? "index" : "/ 100"}
            </span>
          </div>

          <div className="h-12">
            {data.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <YAxis hide domain={[min - pad, max + pad]} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={lineColor}
                    strokeWidth={1.5}
                    fill={lineColor}
                    fillOpacity={0.12}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                No chart data
              </p>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
  );
}

export function SentimentCards() {
  const { data, isLoading, error, refetch } = useSentiment();
  const cards = data?.cards ?? [];

  if (error && !data) {
    return (
      <section>
        <h2 className="ui-title">Market Sentiment</h2>
        <p className="ui-description">Fear &amp; Greed and volatility signals</p>
        <div className="ui-card mt-4 flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-error-600 dark:text-error-500">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="ui-button ui-button-primary"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="ui-title">Market Sentiment</h2>
      <p className="ui-description">Fear &amp; Greed and volatility signals</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && cards.length === 0
          ? Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => (
              <SentimentCardItem key={card.label} card={card} />
            ))}
      </div>
    </section>
  );
}
