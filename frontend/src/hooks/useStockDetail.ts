"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StockDetail } from "@/types/stock-detail";

interface LoadedDetail {
  symbol: string;
  data: StockDetail;
}

export function useStockDetail(symbol: string | null) {
  const [loaded, setLoaded] = useState<LoadedDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = symbol !== null && loaded?.symbol !== symbol;
  const data = !isLoading && loaded?.symbol === symbol ? loaded.data : null;

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    api
      .get<StockDetail>(`/api/market/stock/${encodeURIComponent(symbol)}`)
      .then((response) => {
        if (!cancelled) {
          setLoaded({ symbol, data: response.data });
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(`Could not load details for ${symbol}.`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, isLoading, error: isLoading ? null : error };
}
