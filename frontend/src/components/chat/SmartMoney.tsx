"use client";

import { Building2, Flame, Landmark, ListChecks, Sparkles } from "lucide-react";
import type { SmartMoneyCongress, SmartMoneyFund, SmartMoneySignal } from "@/types/chat";
import { ChatCard } from "./ChatCard";
import { stanceBadge, usd } from "./formatters";

// =========================================================
// Smart Money — whale analysis: stance, key points, signals, congress
// =========================================================
const ACTION_CHIP: Record<string, { label: string; cls: string }> = {
  new_buy: { label: "New position", cls: "ui-badge ui-badge-success" },
  add: { label: "Adding", cls: "ui-badge ui-badge-success" },
  trim: { label: "Trimming", cls: "ui-badge ui-badge-warning" },
  exit: { label: "Exited", cls: "ui-badge ui-badge-error" },
};

export function SmartMoney(props: Record<string, unknown>) {
  const summary = (props.summary as string) ?? "";
  const stance = (props.institution_stance as string) ?? "mixed";
  const keyPoints = (props.key_points as string[]) ?? [];
  const signals = (props.signals as SmartMoneySignal[]) ?? [];
  const funds = (props.fund_activity as SmartMoneyFund[]) ?? [];
  const congress = (props.congress as SmartMoneyCongress) ?? null;

  const congressTotal = (congress?.buys ?? 0) + (congress?.sells ?? 0);
  const buyWidth = congressTotal > 0 ? ((congress?.buys ?? 0) / congressTotal) * 100 : 50;

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
      {/* Summary + key takeaways */}
      <ChatCard
        title="Smart Money Radar"
        icon={Sparkles}
        aside={<span className={stanceBadge(stance)}>{stance}</span>}
        className={keyPoints.length > 0 ? "xl:col-span-2" : ""}
      >
        <div className={keyPoints.length > 0 ? "grid gap-5 lg:grid-cols-5" : ""}>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 lg:col-span-2">
            {summary}
          </p>
          {keyPoints.length > 0 && (
            <div className="ui-tile lg:col-span-3">
              <p className="ui-label mb-2 flex items-center gap-1.5">
                <ListChecks size={13} aria-hidden="true" /> Key takeaways
              </p>
              <ul className="space-y-2">
                {keyPoints.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ChatCard>

      {/* High-conviction signals */}
      {signals.length > 0 && (
        <ChatCard
          title="High-Conviction Moves"
          icon={Flame}
          description="Names multiple funds are buying — more flames, more agreement"
        >
          <ul className="space-y-2">
            {signals.map((s, i) => (
              <li
                key={i}
                className="ui-tile ui-tile-interactive flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex shrink-0 text-brand-500" aria-label={`${s.fund_count} funds`}>
                    {Array.from({ length: Math.min(s.fund_count, 3) }).map((_, f) => (
                      <Flame key={f} size={14} aria-hidden="true" />
                    ))}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
                      {s.issuer}
                    </p>
                    <p className="ui-caption tabular-nums">
                      {s.fund_count} fund{s.fund_count > 1 ? "s" : ""} · {usd(s.combined_value_change)}
                    </p>
                  </div>
                </div>
                <span className={ACTION_CHIP[s.action]?.cls ?? "ui-badge ui-badge-neutral"}>
                  {ACTION_CHIP[s.action]?.label ?? s.action}
                </span>
              </li>
            ))}
          </ul>
        </ChatCard>
      )}

      {/* Congress flow meter */}
      {congress && congressTotal > 0 && (
        <ChatCard
          title="Capitol Hill Flow"
          icon={Landmark}
          description="Recent congressional stock disclosures"
          aside={
            <span className={`ui-badge ${congress.net_millions >= 0 ? "ui-badge-success" : "ui-badge-error"}`}>
              net {congress.net_millions >= 0 ? "+" : "−"}${Math.abs(congress.net_millions).toFixed(0)}M
            </span>
          }
        >
          <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
            <div className="bg-success-500" style={{ width: `${buyWidth}%` }} />
            <div className="bg-error-500" style={{ width: `${100 - buyWidth}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium tabular-nums">
            <span className="text-success-600 dark:text-success-500">
              {congress.buys} buys · ~${congress.approx_buy_millions.toFixed(0)}M
            </span>
            <span className="text-error-600 dark:text-error-500">
              {congress.sells} sells · ~${congress.approx_sell_millions.toFixed(0)}M
            </span>
          </div>
          {congress.recent.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
              {congress.recent.map((t, i) => {
                const bought = t.action.startsWith("purchase");
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-xs first:pt-0 last:pb-0">
                    <span className="min-w-0 truncate text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-white/90">{t.politician}</span>{" "}
                      <span className={bought ? "text-success-600 dark:text-success-500" : "text-error-600 dark:text-error-500"}>
                        {bought ? "bought" : "sold"}
                      </span>{" "}
                      <span className="font-semibold text-gray-900 dark:text-white/90">{t.ticker ?? t.asset}</span>
                    </span>
                    <span className="ui-caption shrink-0 tabular-nums">
                      {t.amount}
                      {t.date ? ` · ${t.date}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ChatCard>
      )}

      {/* Per-fund activity */}
      {funds.length > 0 && (
        <ChatCard
          title="Whale Activity"
          icon={Building2}
          description="Latest 13F quarter, per fund"
          className="xl:col-span-2"
        >
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {funds.map((f) => (
              <div key={f.fund} className="ui-tile flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
                      {f.fund}
                    </p>
                    {f.period && <p className="ui-caption">as of {f.period}</p>}
                  </div>
                  <span className={stanceBadge(f.stance)}>{f.stance}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { n: f.new_buys, l: "new", c: "text-success-600 dark:text-success-500" },
                    { n: f.adds, l: "adds", c: "text-success-600 dark:text-success-500" },
                    { n: f.trims, l: "trims", c: "text-warning-600 dark:text-warning-500" },
                    { n: f.exits, l: "exits", c: "text-error-600 dark:text-error-500" },
                  ].map((x) => (
                    <div key={x.l} className="rounded-lg bg-white px-1 py-1.5 dark:bg-white/[0.04]">
                      <p className={`text-base font-semibold tabular-nums ${x.c}`}>{x.n}</p>
                      <p className="ui-label">{x.l}</p>
                    </div>
                  ))}
                </div>
                <p className="ui-caption tabular-nums">
                  Net flow ≈ <span className="font-medium text-gray-700 dark:text-gray-300">{usd(f.flow_score * 1e9)}</span>
                </p>
                {f.top_moves.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {f.top_moves.map((m, i) => (
                      <span
                        key={i}
                        className={`${ACTION_CHIP[m.action]?.cls ?? "ui-badge ui-badge-neutral"} tabular-nums`}
                        title={ACTION_CHIP[m.action]?.label ?? m.action}
                      >
                        {m.issuer} · {usd(Math.abs(m.value_change))}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ChatCard>
      )}
    </div>
  );
}
