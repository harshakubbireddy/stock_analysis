"use client";

import { RefreshCw } from "lucide-react";
import { useMarketOverview } from "@/hooks/useMarketOverview";
import { cn } from "@/lib/utils";
import { FearGreedGauge } from "./FearGreedGauge";
import { MarketSnapshotStrip } from "./MarketSnapshotStrip";
import { SectorHeatmap } from "./SectorHeatmap";
import { SentimentCards } from "./SentimentCards";

export function MarketOverviewDashboard() {
  const { data, isLoading, error, lastUpdated, refetch } = useMarketOverview();

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString()}`
            : "Loading market data…"}
        </p>
        <button
          type="button"
          onClick={refetch}
          disabled={isLoading}
          className="ui-button ui-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={cn(isLoading && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {error && !data ? (
        <div className="ui-card flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-error-600 dark:text-error-500">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="ui-button ui-button-primary"
          >
            Retry
          </button>
        </div>
      ) : isLoading && !data ? (
        <>
          <SentimentCards />
          <MarketSnapshotStrip
            quotes={[]}
            isLoading
            title="US Market"
            description="Major US benchmarks"
          />
          <FearGreedGauge
            title="CNN Fear & Greed Index"
            description="What emotion is driving the US stock market now?"
            endpoint="/api/market/sentiment/cnn-fng"
          />
          <MarketSnapshotStrip
            quotes={[]}
            isLoading
            title="India Market"
            description="Major Indian benchmarks"
          />
          <MarketSnapshotStrip
            quotes={[]}
            isLoading
            title="Crypto Market"
            description="Top cryptocurrencies in USD"
          />
          <FearGreedGauge
            title="Crypto Fear & Greed Index"
            description="What emotion is driving the crypto market now?"
            endpoint="/api/market/sentiment/crypto-fng"
          />
        </>
      ) : data ? (
        <>
          <SentimentCards />
          <MarketSnapshotStrip
            quotes={data.usa}
            isLoading={isLoading}
            title="US Market"
            description="Major US benchmarks"
          />
          <FearGreedGauge
            title="CNN Fear & Greed Index"
            description="What emotion is driving the US stock market now?"
            endpoint="/api/market/sentiment/cnn-fng"
          />
          <MarketSnapshotStrip
            quotes={data.india}
            isLoading={isLoading}
            title="India Market"
            description="Major Indian benchmarks"
          />
          <MarketSnapshotStrip
            quotes={data.crypto}
            isLoading={isLoading}
            title="Crypto Market"
            description="Top cryptocurrencies in USD"
          />
          <FearGreedGauge
            title="Crypto Fear & Greed Index"
            description="What emotion is driving the crypto market now?"
            endpoint="/api/market/sentiment/crypto-fng"
          />
          <SectorHeatmap sectors={data.usa_sectors} />
        </>
      ) : null}
    </div>
  );
}
