"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// =========================================================
// ChatCard — consistent shell for every generated-UI card:
// icon box + title + optional description on the left,
// optional badge/action on the right, then body content.
// =========================================================
type ChatCardProps = {
  title: string;
  icon?: LucideIcon;
  description?: string;
  aside?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

export function ChatCard({
  title,
  icon: Icon,
  description,
  aside,
  className,
  bodyClassName,
  children,
}: ChatCardProps) {
  return (
    <section className={cn("ui-card flex flex-col", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="ui-icon-box h-9 w-9 shrink-0 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
              <Icon size={18} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="ui-section-title truncate">{title}</h3>
            {description && <p className="ui-caption mt-0.5">{description}</p>}
          </div>
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>
      <div className={cn("flex-1 px-5 pb-5 pt-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Tiny label + value block used inside card grids. */
export function Stat({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="ui-tile min-w-0">
      <p className="ui-label truncate">{label}</p>
      <p className={cn("mt-1 truncate text-base font-semibold tabular-nums text-gray-900 dark:text-white/90", valueClassName)}>
        {value}
      </p>
      {sub && <p className="ui-caption mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
