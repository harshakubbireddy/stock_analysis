"use client";

import { TrendingUp } from "lucide-react";

/**
 * ChatComponent — maps a component name (from the backend) to a React component.
 * This is the registry. Add new entries here as you build more UI tools.
 *
 * Each component receives `props` — the same dict the tool returned.
 */

// --- market_overview component ---
function MarketOverviewCard({ summary }: { summary: string }) {
  return (
    <div className="ui-card w-full max-w-sm p-4">
      <div className="flex items-center gap-3">
        <span className="ui-icon-box h-9 w-9 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
          <TrendingUp size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="ui-title text-sm">Market Overview</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{summary}</p>
        </div>
      </div>
    </div>
  );
}

// --- Registry: component name → React component ---
const registry: Record<
  string,
  React.ComponentType<Record<string, unknown>>
> = {
  market_overview: MarketOverviewCard as React.ComponentType<
    Record<string, unknown>
  >,
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
