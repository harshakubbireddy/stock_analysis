"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FngDetail } from "@/types/sentiment";

export function useFngDetail(endpoint: string) {
  const [data, setData] = useState<FngDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFng = useCallback(() => {
    return api
      .get<FngDetail>(endpoint)
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
  }, [endpoint]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    void fetchFng();
  }, [fetchFng]);

  useEffect(() => {
    void fetchFng();
  }, [fetchFng]);

  return { data, isLoading, error, refetch };
}
