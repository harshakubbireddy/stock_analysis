"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NewsFeed } from "@/types/stock-detail";

interface LoadedFeed {
  key: string;
  items: NewsFeed["items"];
}

export function useNewsFeed(symbols: string[]) {
  const key = symbols.join(",");
  const [loaded, setLoaded] = useState<LoadedFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = key !== "" && loaded?.key !== key;
  const items = !isLoading && loaded?.key === key ? loaded.items : [];

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api
      .get<NewsFeed>("/api/market/news", { params: { symbols: key } })
      .then((response) => {
        if (!cancelled) {
          setLoaded({ key, items: response.data.items });
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load market headlines.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { items, isLoading, error: isLoading ? null : error };
}
