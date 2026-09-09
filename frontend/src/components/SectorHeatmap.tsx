import { TrendingDown, TrendingUp } from "lucide-react";
import type { MarketQuote } from "@/types/market";

function tileColors(changePercent: number | null): {
  backgroundColor: string;
  color: string;
} {
  if (changePercent === null || Math.abs(changePercent) < 0.05) {
    return { backgroundColor: "var(--surface-subtle)", color: "var(--muted)" };
  }
  const intensity = Math.min(Math.abs(changePercent) / 2, 1);
  const rgb = changePercent >= 0 ? "18, 183, 106" : "240, 68, 56";
  const alpha = 0.15 + intensity * 0.75;
  return {
    backgroundColor: `rgba(${rgb}, ${alpha})`,
    color: alpha > 0.45 ? "#ffffff" : "var(--foreground)",
  };
}

export function SectorHeatmap({ sectors }: { sectors: MarketQuote[] }) {
  return (
    <section className="ui-card">
      <header className="ui-card-header">
        <div>
          <h2 className="ui-title">US Sector Heatmap</h2>
          <p className="ui-description">
            S&P 500 sector ETFs, daily performance
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-error-500" />
            Loss
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-success-500" />
            Gain
          </span>
        </div>
      </header>
      <div className="ui-card-body">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {sectors.map((sector) => {
            const pct = sector.change_percent;
            const isUp = pct !== null && pct >= 0;
            return (
              <div
                key={sector.symbol}
                className="flex h-28 flex-col justify-between rounded-xl p-4 transition-transform duration-150 hover:-translate-y-0.5"
                style={tileColors(pct)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {sector.name}
                  </p>
                  <p className="text-xs opacity-80">{sector.symbol}</p>
                </div>
                <p className="flex items-center gap-1.5 text-lg font-semibold">
                  {pct === null ? (
                    "—"
                  ) : (
                    <>
                      {isUp ? (
                        <TrendingUp size={16} aria-hidden="true" />
                      ) : (
                        <TrendingDown size={16} aria-hidden="true" />
                      )}
                      {isUp ? "+" : ""}
                      {pct.toFixed(2)}%
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
