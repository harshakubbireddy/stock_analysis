"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MarketOverview } from "@/types/market";

export function useMarketOverview() {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOverview = useCallback(() => {
    return api
      .get<MarketOverview>("/api/market/overview")
      .then((response) => {
        setData(response.data);
        setError(null);
        setLastUpdated(new Date());
      })
      .catch(() => {
        setError("Could not load market data. Make sure the backend is running.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  return { data, isLoading, error, lastUpdated, refetch };
}
