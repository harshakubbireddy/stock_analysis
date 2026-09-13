"use client";

/**
 * ChatComponent — maps a component name (from the backend) to a React component.
 * This is the registry. Add new entries here as you build more UI tools.
 */
import { CalendarDays, Flame, Landmark, Sparkles } from "lucide-react";

// --- Shared helpers ---
function marketSummary(usa: { name: string; change_percent: number | null }[]): string {
  const sp500 = usa.find((q) => q.name === "S&P 500");
  if (sp500?.change_percent == null) return "Market data unavailable";
  return sp500.change_percent >= 0
    ? `Market is up today (${sp500.change_percent.toFixed(2)}%)`
    : `Market is down today (${sp500.change_percent.toFixed(2)}%)`;
}

function pctStyle(pct: number | null): string {
  if (pct == null) return "text-gray-400";
  return pct >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

function pctBar(pct: number | null): string {
  if (pct == null) return "";
  return pct >= 0 ? "bg-green-500" : "bg-red-500";
}

// =========================================================
// Stock Market Overview — index grid cards + sector bars
// =========================================================
function StockMarketOverview(props: Record<string, unknown>) {
  const usa = (props.usa as { name: string; symbol: string; price: number | null; change_percent: number | null }[]) ?? [];
  const india = (props.india as typeof usa) ?? [];
  const crypto = (props.crypto as typeof usa) ?? [];
  const sectors = (props.usa_sectors as { name: string; change_percent: number | null }[]) ?? [];

  function IndexCard({ q }: { q: (typeof usa)[0] }) {
    return (
      <div className="ui-card p-3">
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {q.name}
        </p>
        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90">
          {q.price?.toLocaleString() ?? "—"}
        </p>
        <p className={`mt-0.5 text-xs font-semibold ${pctStyle(q.change_percent)}`}>
          {q.change_percent != null
            ? `${q.change_percent >= 0 ? "+" : ""}${q.change_percent.toFixed(2)}%`
            : "—"}
        </p>
      </div>
    );
  }

  function Section({ title, quotes }: { title: string; quotes: typeof usa }) {
    if (quotes.length === 0) return null;
    return (
      <div>
        <h3 className="ui-title text-sm mb-2">{title}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quotes.map((q) => (
            <IndexCard key={q.symbol} q={q} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="ui-card p-6">
        <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
          {marketSummary(usa)}
        </p>
      </div>

      {/* Index grid card */}
      <div className="ui-card space-y-5 p-6">
        <Section title="US Indices" quotes={usa} />
        <Section title="India Indices" quotes={india} />
        <Section title="Crypto" quotes={crypto} />
      </div>

      {/* Sector performance card */}
      <div className="ui-card p-6">
        <h3 className="ui-title text-sm mb-3">Sector Performance</h3>
        <div className="space-y-2">
          {sectors.map((s) => {
            const pct = s.change_percent ?? 0;
            const width = Math.min(Math.abs(pct) * 30, 100);
            return (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-36 truncate text-xs text-gray-600 dark:text-gray-400">
                  {s.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5">
                  <div
                    className={`h-full rounded-full ${pctBar(s.change_percent)}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className={`w-16 text-right text-xs font-medium ${pctStyle(s.change_percent)}`}>
                  {s.change_percent != null
                    ? `${s.change_percent >= 0 ? "+" : ""}${s.change_percent.toFixed(2)}%`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// News Summary — list of latest headlines with links
// =========================================================
type NewsItem = {
  title: string;
  summary: string | null;
  publisher: string | null;
  url: string | null;
  published: string | null;
  symbol: string | null;
};

function NewsSummary(props: Record<string, unknown>) {
  const items = (props.items as NewsItem[]) ?? [];

  return (
    <div className="ui-card p-6">
      <h3 className="ui-title text-sm mb-3">News Summary</h3>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-gray-400">No news available</p>
        )}
        {items.map((item, i) => (
          <a
            key={i}
            href={item.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white/90">
              {item.title}
            </p>
            {item.summary && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                {item.summary}
              </p>
            )}
            <p className="mt-0.5 text-xs text-gray-400">
              {item.publisher}
              {item.symbol ? ` · ${item.symbol}` : ""}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// Shared types/helpers for macro + smart-money components
// =========================================================
type CpiPoint = { date: string; value: number };
type CpiReportProps = {
  date: string | null;
  headline_yoy: number | null;
  headline_mom: number | null;
  core_yoy: number | null;
  value: number | null;
  history: CpiPoint[];
  trend: string;
  error: string | null;
};

type YieldRow = {
  symbol: string;
  name: string;
  maturity_years: number | null;
  yield_pct: number | null;
  change_bps: number | null;
  month_ago_yield_pct: number | null;
};

type EconEvent = {
  title: string;
  date: string;
  impact: string;
  forecast: string | null;
  previous: string | null;
};

function usd(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function trendBadge(trend: string): string {
  if (trend === "Cooling") return "ui-badge ui-badge-success";
  if (trend === "Re-accelerating") return "ui-badge ui-badge-error";
  return "ui-badge ui-badge-warning";
}

// =========================================================
// CPI Report — headline/core YoY + 12-month mini bar chart
// =========================================================
function CpiHistoryBars({ history }: { history: CpiPoint[] }) {
  if (history.length === 0) return null;
  const max = Math.max(...history.map((p) => p.value));
  return (
    <div className="mt-3">
      <div className="flex h-16 items-end gap-1">
        {history.map((p) => (
          <div
            key={p.date}
            className="flex-1 rounded-sm bg-brand-500/70"
            style={{ height: `${Math.max((p.value / max) * 100, 4)}%` }}
            title={`${p.date}: ${p.value.toFixed(1)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>{history[0].date}</span>
        <span>{history[history.length - 1].date}</span>
      </div>
    </div>
  );
}

function CpiCard(props: CpiReportProps) {
  if (props.error) {
    return (
      <p className="text-sm text-gray-400">
        CPI data unavailable ({props.error})
      </p>
    );
  }
  const metrics = [
    { label: "Headline CPI YoY", value: props.headline_yoy },
    { label: "Core CPI YoY", value: props.core_yoy },
    { label: "Headline MoM", value: props.headline_mom },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ui-icon-box h-8 w-8 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
            <Flame size={16} aria-hidden="true" />
          </span>
          <p className="ui-title text-sm">CPI Report</p>
        </div>
        <span className={trendBadge(props.trend)}>{props.trend}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-gray-50 p-2 dark:bg-white/[0.03]">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {m.label}
            </p>
            <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white/90">
              {m.value != null ? `${m.value.toFixed(2)}%` : "—"}
            </p>
          </div>
        ))}
      </div>
      <CpiHistoryBars history={props.history ?? []} />
      {props.date && (
        <p className="mt-2 text-[10px] text-gray-400">Latest print: {props.date} (FRED)</p>
      )}
    </div>
  );
}

function CpiReport(props: Record<string, unknown>) {
  return (
    <div className="ui-card p-6">
      <CpiCard {...(props as unknown as CpiReportProps)} />
    </div>
  );
}

// =========================================================
// Upcoming Economic Events — impact-badged schedule
// =========================================================
function EventsList({ events }: { events: EconEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400">No US events scheduled this week.</p>;
  }
  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-2.5 dark:bg-white/[0.03]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white/90">
              {e.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {e.date}
              {(e.forecast || e.previous) &&
                ` · forecast ${e.forecast ?? "—"} vs prev ${e.previous ?? "—"}`}
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
        </div>
      ))}
    </div>
  );
}

function UpcomingEconomicEvents(props: Record<string, unknown>) {
  const events = (props.events as EconEvent[]) ?? [];
  return (
    <div className="ui-card p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="ui-icon-box h-8 w-8 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
          <CalendarDays size={16} aria-hidden="true" />
        </span>
        <p className="ui-title text-sm">Upcoming Economic Events</p>
      </div>
      <EventsList events={events} />
    </div>
  );
}

// =========================================================
// Bond Market Overview — yields, curve, ETFs, CPI + events inside
// =========================================================
function BondMarketOverview(props: Record<string, unknown>) {
  const yields = (props.yields as YieldRow[]) ?? [];
  const curve = (props.curve as YieldRow[]) ?? [];
  const etfs =
    (props.etfs as { symbol: string; name: string; price: number | null; change_percent: number | null }[]) ?? [];
  const cpi = (props.cpi_report as CpiReportProps) ?? null;
  const events = (props.upcoming_events as EconEvent[]) ?? [];
  const spread = props.spread_13w_10y_bps as number | null;
  const shape = props.curve_shape as string;
  const maxYield = Math.max(...curve.map((c) => c.yield_pct ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="ui-card p-6">
        <div className="flex items-center gap-3">
          <span className="ui-icon-box h-10 w-10 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
            <Landmark size={20} aria-hidden="true" />
          </span>
          <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
            {(props.summary as string) || "Bond market overview"}
          </p>
        </div>
      </div>

      {/* Yields + curve */}
      <div className="ui-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="ui-title text-sm">Treasury Yields</h3>
          {spread != null && (
            <span className="ui-badge ui-badge-warning">
              13W–10Y spread {spread > 0 ? "+" : ""}
              {spread.toFixed(0)} bps · {shape}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {yields.map((y) => (
            <div key={y.symbol} className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
              <p className="truncate text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {y.name}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-white/90">
                {y.yield_pct != null ? `${y.yield_pct.toFixed(2)}%` : "—"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {y.change_bps != null
                  ? `${y.change_bps >= 0 ? "▲" : "▼"} ${Math.abs(y.change_bps).toFixed(0)} bps today`
                  : "—"}
                {y.month_ago_yield_pct != null && ` · 1M: ${y.month_ago_yield_pct.toFixed(2)}%`}
              </p>
            </div>
          ))}
        </div>

        {curve.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Yield curve
            </p>
            <div className="space-y-1.5">
              {curve.map((c) => (
                <div key={c.symbol} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-gray-600 dark:text-gray-400">
                    {c.maturity_years === 0.25 ? "3 Mo" : `${c.maturity_years} Yr`}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-white/5">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${((c.yield_pct ?? 0) / maxYield) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    {c.yield_pct?.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bond ETFs */}
      <div className="ui-card p-6">
        <h3 className="ui-title text-sm mb-3">Bond ETFs</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {etfs.map((e) => (
            <div key={e.symbol} className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold text-gray-900 dark:text-white/90">
                {e.symbol} <span className="font-normal text-gray-500">· {e.name}</span>
              </p>
              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                {e.price != null ? `$${e.price.toLocaleString()}` : "—"}
              </p>
              <p className={`text-xs font-medium ${pctStyle(e.change_percent)}`}>
                {e.change_percent != null
                  ? `${e.change_percent >= 0 ? "+" : ""}${e.change_percent.toFixed(2)}%`
                  : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CPI report (under bond market) */}
      {cpi && (
        <div className="ui-card p-6">
          <CpiCard {...cpi} />
        </div>
      )}

      {/* Upcoming events (under bond market) */}
      <div className="ui-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="ui-icon-box h-8 w-8 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
            <CalendarDays size={16} aria-hidden="true" />
          </span>
          <p className="ui-title text-sm">Upcoming Economic Events</p>
        </div>
        <EventsList events={events} />
      </div>
    </div>
  );
}

// =========================================================
// Smart Money — whale analysis: stance, key points, signals, congress
// =========================================================
type SmartMoneySignal = {
  issuer: string;
  action: string;
  fund_count: number;
  combined_value_change: number;
};

type SmartMoneyFund = {
  fund: string;
  period: string | null;
  new_buys: number;
  adds: number;
  trims: number;
  exits: number;
  flow_score: number;
  stance: string;
  top_moves: { action: string; issuer: string; value_change: number; pct_of_portfolio: number }[];
};

type SmartMoneyCongress = {
  buys: number;
  sells: number;
  approx_buy_millions: number;
  approx_sell_millions: number;
  net_millions: number;
  top_buy: string | null;
  top_sell: string | null;
  recent: {
    politician: string;
    action: string;
    ticker: string | null;
    asset: string;
    amount: string;
    date: string | null;
  }[];
};

const ACTION_CHIP: Record<string, { label: string; cls: string }> = {
  new_buy: { label: "New position", cls: "ui-badge ui-badge-success" },
  add: { label: "Adding", cls: "ui-badge ui-badge-success" },
  trim: { label: "Trimming", cls: "ui-badge ui-badge-warning" },
  exit: { label: "Exited", cls: "ui-badge ui-badge-error" },
};

function stanceBadge(stance: string): string {
  if (stance === "Accumulating" || stance === "net accumulation")
    return "ui-badge ui-badge-success";
  if (stance === "Distributing" || stance === "net distribution")
    return "ui-badge ui-badge-error";
  return "ui-badge ui-badge-warning";
}

function SmartMoney(props: Record<string, unknown>) {
  const summary = (props.summary as string) ?? "";
  const stance = (props.institution_stance as string) ?? "mixed";
  const keyPoints = (props.key_points as string[]) ?? [];
  const signals = (props.signals as SmartMoneySignal[]) ?? [];
  const funds = (props.fund_activity as SmartMoneyFund[]) ?? [];
  const congress = (props.congress as SmartMoneyCongress) ?? null;

  const congressTotal =
    (congress?.buys ?? 0) + (congress?.sells ?? 0);
  const buyWidth = congressTotal > 0 ? ((congress?.buys ?? 0) / congressTotal) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Summary + stance */}
      <div className="ui-card p-6">
        <div className="flex items-start gap-3">
          <span className="ui-icon-box h-10 w-10 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="ui-title text-sm">Smart Money Radar</p>
              <span className={stanceBadge(stance)}>{stance}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{summary}</p>
          </div>
        </div>
      </div>

      {/* Key points */}
      {keyPoints.length > 0 && (
        <div className="ui-card p-6">
          <h3 className="ui-title text-sm mb-3">Key Takeaways</h3>
          <ul className="space-y-2">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* High-conviction signals */}
      {signals.length > 0 && (
        <div className="ui-card p-6">
          <h3 className="ui-title text-sm mb-1">High-Conviction Moves</h3>
          <p className="ui-description mb-3">
            Names multiple funds are buying — bigger flame, more agreement
          </p>
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-2.5 dark:bg-white/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-brand-500" aria-hidden="true">
                    {Array.from({ length: Math.min(s.fund_count, 3) }).map((_, f) => (
                      <Flame key={f} size={14} className="inline" />
                    ))}
                  </span>
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white/90">
                    {s.issuer}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={ACTION_CHIP[s.action]?.cls ?? "ui-badge"}>
                    {ACTION_CHIP[s.action]?.label ?? s.action}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {s.fund_count} fund{s.fund_count > 1 ? "s" : ""} · {usd(s.combined_value_change)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-fund activity */}
      {funds.length > 0 && (
        <div className="ui-card p-6">
          <h3 className="ui-title text-sm mb-3">Whale Activity (latest 13F quarter)</h3>
          <div className="space-y-3">
            {funds.map((f) => (
              <div key={f.fund} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    {f.fund}
                  </p>
                  <div className="flex items-center gap-2">
                    {f.period && (
                      <span className="text-[10px] text-gray-400">as of {f.period}</span>
                    )}
                    <span className={stanceBadge(f.stance)}>{f.stance}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="ui-badge ui-badge-success">{f.new_buys} new</span>
                  <span className="ui-badge ui-badge-success">{f.adds} adds</span>
                  <span className="ui-badge ui-badge-warning">{f.trims} trims</span>
                  <span className="ui-badge ui-badge-error">{f.exits} exits</span>
                  <span className="text-gray-500 dark:text-gray-400 self-center">
                    flow ≈ {usd(f.flow_score * 1e9)}
                  </span>
                </div>
                {f.top_moves.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {f.top_moves
                      .map(
                        (m) =>
                          `${m.issuer} (${(ACTION_CHIP[m.action]?.label ?? m.action).toLowerCase()} ${usd(
                            Math.abs(m.value_change)
                          )})`
                      )
                      .join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Congress flow meter */}
      {congress && congressTotal > 0 && (
        <div className="ui-card p-6">
          <h3 className="ui-title text-sm mb-3">Capitol Hill Flow</h3>
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-green-500" style={{ width: `${buyWidth}%` }} />
            <div className="bg-red-500" style={{ width: `${100 - buyWidth}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-green-600 dark:text-green-400">
              {congress.buys} buys (~${congress.approx_buy_millions.toFixed(0)}M)
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              net {congress.net_millions >= 0 ? "+" : "−"}${Math.abs(congress.net_millions).toFixed(0)}M
            </span>
            <span className="text-red-600 dark:text-red-400">
              {congress.sells} sells (~${congress.approx_sell_millions.toFixed(0)}M)
            </span>
          </div>
          {congress.recent.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {congress.recent.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <span className="truncate">
                    {t.politician} {t.action.startsWith("purchase") ? "bought" : "sold"}{" "}
                    <span className="font-medium text-gray-900 dark:text-white/90">
                      {t.ticker ?? t.asset}
                    </span>
                  </span>
                  <span className="shrink-0">
                    {t.amount} {t.date ? `· ${t.date}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// Registry
// =========================================================
const registry: Record<
  string,
  React.ComponentType<Record<string, unknown>>
> = {
  stock_market_overview: StockMarketOverview as React.ComponentType<
    Record<string, unknown>
  >,
  bond_market_overview: BondMarketOverview as React.ComponentType<
    Record<string, unknown>
  >,
  cpi_report: CpiReport as React.ComponentType<Record<string, unknown>>,
  upcoming_economic_events: UpcomingEconomicEvents as React.ComponentType<
    Record<string, unknown>
  >,
  smart_money: SmartMoney as React.ComponentType<Record<string, unknown>>,
  news_summary: NewsSummary as React.ComponentType<
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
