"use client";

import { useCallback, useEffect, useState } from "react";
import { api, clearCache } from "@/lib/api";
import type { TrendingData } from "@/types/trending";

export function useTrending() {
  const [data, setData] = useState<TrendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(() => {
    return api
      .get<TrendingData>("/api/market/trending")
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch(() => {
        setError("Could not load trending stocks. Make sure the backend is running.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    void clearCache().then(() => fetchTrending());
  }, [fetchTrending]);

  useEffect(() => {
    void fetchTrending();
  }, [fetchTrending]);

  return { data, isLoading, error, refetch };
}
