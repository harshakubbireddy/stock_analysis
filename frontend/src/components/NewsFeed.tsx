"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Newspaper, Plus } from "lucide-react";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NewsFeed as NewsFeedData, NewsItem } from "@/types/stock-detail";

function relativeTime(published: string | null): string {
  if (!published) return "";
  const date = new Date(published);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function NewsFeed({ symbols }: { symbols: string[] }) {
  const symbolsKey = symbols.join(",");
  const { items, isLoading, error } = useNewsFeed(symbols);
  const [extra, setExtra] = useState<{ key: string; items: NewsItem[] }>({
    key: "",
    items: [],
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [noNewItems, setNoNewItems] = useState(false);

  const extraItems = extra.key === symbolsKey ? extra.items : [];
  const allItems = [...items];
  const seenTitles = new Set(allItems.map((item) => item.title));
  for (const item of extraItems) {
    if (!seenTitles.has(item.title)) {
      allItems.push(item);
      seenTitles.add(item.title);
    }
  }

  const loadMore = () => {
    setIsLoadingMore(true);
    setMoreError(null);
    api
      .get<NewsFeedData>("/api/market/news/more", {
        params: { symbols: symbolsKey },
      })
      .then((response) => {
        const fresh = response.data.items.filter(
          (item) => !seenTitles.has(item.title),
        );
        setNoNewItems(fresh.length === 0);
        setExtra((current) => ({
          key: symbolsKey,
          items: [...(current.key === symbolsKey ? current.items : []), ...fresh],
        }));
      })
      .catch(() => {
        setMoreError("Could not load more headlines.");
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  };

  return (
    <section className="ui-card">
      <header className="ui-card-header">
        <div className="flex items-center gap-3">
          <span className="ui-icon-box h-10 w-10">
            <Newspaper size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="ui-title">Market Headlines</h2>
            <p className="ui-description">
              Latest news on today&apos;s trending stocks
            </p>
          </div>
        </div>
      </header>
      <div className="ui-card-body pt-2">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-error-600 dark:text-error-500">
            {error}
          </p>
        ) : allItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            No headlines available
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {allItems.map((item, index) => (
              <li key={`${item.symbol}-${index}`} className="py-3">
                <a
                  href={item.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-brand-500 dark:text-white/90">
                      {item.title}
                      <ExternalLink
                        size={12}
                        aria-hidden="true"
                        className="ml-1.5 inline text-gray-400 group-hover:text-brand-500"
                      />
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {[item.publisher, relativeTime(item.published)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="ui-badge shrink-0 bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
                    {item.symbol}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !error && symbols.length > 0 && (
          <div className="flex flex-col items-center gap-2 pt-4">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="ui-button ui-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus
                size={16}
                aria-hidden="true"
                className={cn(isLoadingMore && "animate-spin")}
              />
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
            {moreError && (
              <p className="text-xs text-error-600 dark:text-error-500">
                {moreError}
              </p>
            )}
            {noNewItems && !moreError && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No new headlines right now
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
