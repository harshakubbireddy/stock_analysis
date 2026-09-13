"use client";

import { useCallback, useEffect, useState } from "react";
import { api, clearCache } from "@/lib/api";
import type { Fund, TransactionsData } from "@/types/thirteenf";

export function useThirteenF() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedCik, setSelectedCik] = useState<string | null>(null);
  const [data, setData] = useState<TransactionsData | null>(null);
  const [isLoadingFunds, setIsLoadingFunds] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Fund[]>("/api/thirteenf/funds")
      .then((response) => {
        setFunds(response.data);
        setSelectedCik((current) => current ?? response.data[0]?.cik ?? null);
      })
      .catch(() => {
        setError("Could not load fund list. Make sure the backend is running.");
      })
      .finally(() => {
        setIsLoadingFunds(false);
      });
  }, []);

  const fetchTransactions = useCallback((cik: string) => {
    queueMicrotask(() => setIsLoading(true));
    return api
      .get<TransactionsData>(`/api/thirteenf/transactions/${cik}`)
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch(() => {
        setData(null);
        setError("Could not load 13F transactions. Please try again.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedCik) {
      void fetchTransactions(selectedCik);
    }
  }, [selectedCik, fetchTransactions]);

  const refetch = useCallback(() => {
    if (selectedCik) {
      void clearCache().then(() => fetchTransactions(selectedCik));
    }
  }, [selectedCik, fetchTransactions]);

  return {
    funds,
    selectedCik,
    selectFund: setSelectedCik,
    data,
    isLoadingFunds,
    isLoading,
    error,
    refetch,
  };
}
