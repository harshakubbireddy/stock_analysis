// --- Shared helpers ---
export function marketSummary(usa: { name: string; change_percent: number | null }[]): string {
  const sp500 = usa.find((q) => q.name === "S&P 500");
  if (sp500?.change_percent == null) return "Market data unavailable";
  return sp500.change_percent >= 0
    ? `Market is up today (${sp500.change_percent.toFixed(2)}%)`
    : `Market is down today (${sp500.change_percent.toFixed(2)}%)`;
}

export function pctStyle(pct: number | null): string {
  if (pct == null) return "text-gray-400";
  return pct >= 0
    ? "text-success-600 dark:text-success-500"
    : "text-error-600 dark:text-error-500";
}

export function pctBar(pct: number | null): string {
  if (pct == null) return "";
  return pct >= 0 ? "bg-success-500" : "bg-error-500";
}

export function usd(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

export function trendBadge(trend: string): string {
  if (trend === "Cooling") return "ui-badge ui-badge-success";
  if (trend === "Re-accelerating") return "ui-badge ui-badge-error";
  return "ui-badge ui-badge-warning";
}

export function stanceBadge(stance: string): string {
  if (stance === "Accumulating" || stance === "net accumulation")
    return "ui-badge ui-badge-success";
  if (stance === "Distributing" || stance === "net distribution")
    return "ui-badge ui-badge-error";
  return "ui-badge ui-badge-warning";
}

export function fmtNum(v: number | null, digits = 2): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtBigMoney(v: number | null): string {
  return v == null ? "—" : `$${fmtCompact(v)}`;
}

export function fmtPct(v: number | null, digits = 2): string {
  if (v == null) return "—";
  return `${v.toFixed(digits)}%`;
}

export function fmtRatioPct(v: number | null): string {
  return fmtPct(v != null ? v * 100 : null);
}

export function fmtCompact(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}
