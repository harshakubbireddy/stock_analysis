"use client";

/**
 * ChatComponent — maps a component name (from the backend) to a React component.
 * This is the registry. Add new entries here as you build more UI tools.
 */
import { BondMarketOverview } from "./chat/BondMarketOverview";
import { CpiReport } from "./chat/CpiReport";
import { NewsSummary } from "./chat/NewsSummary";
import { SmartMoney } from "./chat/SmartMoney";
import { StockAnalysisBySymbol } from "./chat/StockAnalysisBySymbol";
import { StockMarketOverview } from "./chat/StockMarketOverview";
import { UpcomingEconomicEvents } from "./chat/UpcomingEconomicEvents";

// =========================================================
// Registry
// =========================================================
const registry: Record<
  string,
  React.ComponentType<Record<string, unknown>>
> = {
  stock_market_overview: StockMarketOverview,
  bond_market_overview: BondMarketOverview,
  cpi_report: CpiReport,
  upcoming_economic_events: UpcomingEconomicEvents,
  smart_money: SmartMoney,
  stock_analysis_by_symbol: StockAnalysisBySymbol,
  news_summary: NewsSummary,
};

export function ChatComponent({
  name,
  props,
}: {
  name: string;
  props: Record<string, unknown>;
}) {
  const Component = registry[name];
  if (!Component) {
    return (
      <p className="text-sm text-gray-500">
        Unknown component: {name}
      </p>
    );
  }
  return <Component {...props} />;
}
