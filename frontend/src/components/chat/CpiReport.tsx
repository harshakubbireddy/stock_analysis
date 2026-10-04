"use client";

import { Flame } from "lucide-react";
import type { CpiPoint, CpiReportProps } from "@/types/chat";
import { ChatCard, Stat } from "./ChatCard";
import { trendBadge } from "./formatters";

// =========================================================
// CPI Report — headline/core YoY + 12-month mini bar chart
// =========================================================
function CpiHistoryBars({ history }: { history: CpiPoint[] }) {
  if (history.length === 0) return null;
  const max = Math.max(...history.map((p) => p.value));
  const last = history[history.length - 1];
  return (
    <div className="mt-4">
      <p className="ui-label mb-2">12-month trend</p>
      <div className="flex h-20 items-end gap-1">
        {history.map((p) => (
          <div
            key={p.date}
            className={`flex-1 rounded-sm transition-colors ${
              p === last ? "bg-brand-500" : "bg-brand-500/40 hover:bg-brand-500/70"
            }`}
            style={{ height: `${Math.max((p.value / max) * 100, 4)}%` }}
            title={`${p.date}: ${p.value.toFixed(1)}`}
          />
        ))}
      </div>
      <div className="ui-caption mt-1.5 flex justify-between">
        <span>{history[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}

export function CpiReport(propsRaw: Record<string, unknown>) {
  const props = propsRaw as unknown as CpiReportProps;

  if (props.error) {
    return (
      <ChatCard title="CPI Report" icon={Flame}>
        <p className="ui-caption">CPI data unavailable ({props.error})</p>
      </ChatCard>
    );
  }

  const metrics = [
    { label: "Headline YoY", value: props.headline_yoy },
    { label: "Core YoY", value: props.core_yoy },
    { label: "Headline MoM", value: props.headline_mom },
  ];

  return (
    <ChatCard
      title="CPI Report"
      icon={Flame}
      description={props.date ? `Latest print ${props.date} · FRED` : "US consumer price inflation"}
      aside={<span className={trendBadge(props.trend)}>{props.trend}</span>}
    >
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <Stat
            key={m.label}
            label={m.label}
            value={m.value != null ? `${m.value.toFixed(2)}%` : "—"}
          />
        ))}
      </div>
      <CpiHistoryBars history={props.history ?? []} />
    </ChatCard>
  );
}
