"use client";

import { CalendarDays } from "lucide-react";
import type { EconEvent } from "@/types/chat";
import { ChatCard } from "./ChatCard";

// =========================================================
// Upcoming Economic Events — impact-badged schedule
// =========================================================
export function UpcomingEconomicEvents(props: Record<string, unknown>) {
  const events = (props.events as EconEvent[]) ?? [];
  const high = events.filter((e) => e.impact === "High").length;

  return (
    <ChatCard
      title="Upcoming Economic Events"
      icon={CalendarDays}
      description="US releases this week"
      aside={
        high > 0 && (
          <span className="ui-badge ui-badge-error">
            {high} high impact
          </span>
        )
      }
    >
      {events.length === 0 ? (
        <p className="ui-caption">No US events scheduled this week.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {events.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white/90">
                  {e.title}
                </p>
                <p className="ui-caption">
                  {e.date}
                  {(e.forecast || e.previous) && (
                    <>
                      {" · "}
                      <span className="tabular-nums">
                        fcst {e.forecast ?? "—"} · prev {e.previous ?? "—"}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <span
                className={
                  e.impact === "High"
                    ? "ui-badge ui-badge-error shrink-0"
                    : "ui-badge ui-badge-warning shrink-0"
                }
              >
                {e.impact}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChatCard>
  );
}
