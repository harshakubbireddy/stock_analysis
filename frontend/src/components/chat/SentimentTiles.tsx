"use client";

// =========================================================
// Sentiment tiles — VIX / CNN Fear & Greed / Crypto Fear & Greed
// Shared by the stock and crypto market overview cards.
// =========================================================
export type SentimentCardData = {
  label: string;
  value: number | null;
  rating: string;
  source: string;
  history?: { date: string; score: number }[];
  error?: string | null;
};

function ratingBadge(rating: string): string {
  const r = rating.toLowerCase();
  if (r.includes("fear") || r.includes("high") || r.includes("elevated")) return "ui-badge ui-badge-error";
  if (r.includes("greed") || r.includes("low")) return "ui-badge ui-badge-success";
  if (r === "unavailable") return "ui-badge ui-badge-neutral";
  return "ui-badge ui-badge-warning";
}

function isFng(card: SentimentCardData) {
  return card.label.toLowerCase().includes("fear");
}

function FngMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative mt-2 h-1.5 w-full rounded-full bg-gradient-to-r from-error-500 via-gray-300 to-success-500 dark:via-gray-600">
      <span
        className="absolute -top-0.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-gray-900 dark:border-gray-900 dark:bg-white"
        style={{ left: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

export function SentimentTile({ card }: { card: SentimentCardData }) {
  const prev = card.history && card.history.length >= 2 ? card.history[card.history.length - 2]?.score : null;
  const delta = card.value != null && prev != null ? card.value - prev : null;
  return (
    <div className="ui-tile min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="ui-label truncate">{card.label}</p>
        <span className={`${ratingBadge(card.rating)} shrink-0`}>{card.rating}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-white/90">
        {card.value != null ? card.value.toFixed(isFng(card) ? 0 : 2) : "—"}
        {isFng(card) && card.value != null && (
          <span className="ml-1 text-xs font-normal text-gray-400">/ 100</span>
        )}
      </p>
      {isFng(card) && card.value != null ? (
        <FngMeter value={card.value} />
      ) : (
        delta != null && (
          <p className={`text-xs tabular-nums ${delta >= 0 ? "text-error-600 dark:text-error-500" : "text-success-600 dark:text-success-500"}`}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)} vs prior close
          </p>
        )
      )}
      {card.error && <p className="ui-caption mt-1 truncate">{card.error}</p>}
    </div>
  );
}
