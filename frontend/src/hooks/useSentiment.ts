"use client";

import { useCallback, useEffect, useState } from "react";
import { api, clearCache } from "@/lib/api";
import type { SentimentOverview } from "@/types/sentiment";

export function useSentiment() {
  const [data, setData] = useState<SentimentOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = useCallback(() => {
    return api
      .get<SentimentOverview>("/api/market/sentiment")
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch(() => {
        setError("Could not load sentiment data. Make sure the backend is running.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    void clearCache().then(() => fetchSentiment());
  }, [fetchSentiment]);

  useEffect(() => {
    void fetchSentiment();
  }, [fetchSentiment]);

  return { data, isLoading, error, refetch };
}
