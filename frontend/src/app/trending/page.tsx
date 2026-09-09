import { TrendingDashboard } from "@/components/TrendingDashboard";

export default function TrendingPage() {
  return (
    <div className="ui-page">
      <div className="ui-container">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          Trending
        </h1>
        <p className="ui-description">
          Stocks gaining momentum in the market right now
        </p>
        <TrendingDashboard />
      </div>
    </div>
  );
}
