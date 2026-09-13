"use client";

import { useCallback, useEffect, useState } from "react";
import { api, clearCache } from "@/lib/api";
import type { CongressTradesData, Trader } from "@/types/congress";

export function useCongressTrades() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [data, setData] = useState<CongressTradesData | null>(null);
  const [isLoadingTraders, setIsLoadingTraders] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Trader[]>("/api/congress/traders")
      .then((response) => {
        setTraders(response.data);
        setSelectedName(
          (current) => current ?? response.data[0]?.last_name ?? null,
        );
      })
      .catch(() => {
        setError("Could not load trader list. Make sure the backend is running.");
      })
      .finally(() => {
        setIsLoadingTraders(false);
      });
  }, []);

  const fetchTrades = useCallback((lastName: string) => {
    queueMicrotask(() => setIsLoading(true));
    return api
      .get<CongressTradesData>("/api/congress/trades", {
        params: { name: lastName },
      })
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch(() => {
        setData(null);
        setError("Could not load congressional trades. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedName) {
      void fetchTrades(selectedName);
    }
  }, [selectedName, fetchTrades]);

  const refetch = useCallback(() => {
    if (selectedName) {
      void clearCache().then(() => fetchTrades(selectedName));
    }
  }, [selectedName, fetchTrades]);

  return {
    traders,
    selectedName,
    selectTrader: setSelectedName,
    data,
    isLoadingTraders,
    isLoading,
    error,
    refetch,
  };
}
