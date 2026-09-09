"use client";

import { useState } from "react";
import { Landmark, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { CongressTradesPanel } from "./CongressTradesPanel";
import { ThirteenFDashboard } from "./ThirteenFDashboard";

const views = [
  { id: "institutions", label: "Institutions (13F)", icon: Landmark },
  { id: "congress", label: "Congress", icon: UserRound },
] as const;

type ViewId = (typeof views)[number]["id"];

export function SmartMoneyDashboard() {
  const [view, setView] = useState<ViewId>("institutions");

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div
        className="inline-flex w-fit items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900"
        role="tablist"
        aria-label="Smart money view"
      >
        {views.map(({ id, label, icon: Icon }) => {
          const isActive = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setView(id)}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {view === "institutions" ? <ThirteenFDashboard /> : <CongressTradesPanel />}
    </div>
  );
}
