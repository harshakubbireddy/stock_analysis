import { MarketOverviewDashboard } from "@/components/MarketOverviewDashboard";

export default function OverviewPage() {
  return (
    <div className="ui-page">
      <div className="ui-container">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          Overview
        </h1>
        <p className="ui-description">
          Your market snapshot and portfolio summary at a glance
        </p>
        <MarketOverviewDashboard />
      </div>
    </div>
  );
}
