"use client";

import { Activity, ArrowRightLeft, TrendingDown, TrendingUp } from "lucide-react";
import type { StockTechnicals } from "@/types/stockAnalysis";
import { ChatCard } from "./ChatCard";
import { fmtNum, pctStyle } from "./formatters";
import { MetricTile } from "./StockAnalysisCharts";

// =========================================================
// Technicals — trend (50/200 DMA), RSI, MACD, Bollinger, ATR
// =========================================================
type Tone = "success" | "error" | "warning" | "neutral";

const TONE_BADGE: Record<Tone, string> = {
  success: "ui-badge ui-badge-success",
  error: "ui-badge ui-badge-error",
  warning: "ui-badge ui-badge-warning",
  neutral: "ui-badge ui-badge-neutral",
};

const TONE_TEXT: Record<Tone, string> = {
  success: "text-success-600 dark:text-success-500",
  error: "text-error-600 dark:text-error-500",
  warning: "text-warning-600 dark:text-warning-500",
  neutral: "text-gray-500 dark:text-gray-400",
};

function trendTone(trend: StockTechnicals["trend"]): Tone {
  return trend === "uptrend" ? "success" : trend === "downtrend" ? "error" : "warning";
}

/** RSI ≥70 is stretched to the upside (bearish risk); ≤30 stretched down (bullish setup). */
function rsiTone(signal: StockTechnicals["rsi_signal"]): Tone {
  return signal === "overbought" ? "error" : signal === "oversold" ? "success" : "neutral";
}

function macdTone(trend: StockTechnicals["macd_trend"]): Tone {
  return trend === "bullish" ? "success" : trend === "bearish" ? "error" : "neutral";
}

function bbLabel(signal: StockTechnicals["bb_signal"]): string {
  return signal === "above_upper" ? "Above upper band" : signal === "below_lower" ? "Below lower band" : "Inside bands";
}

function signedPct(v: number | null): string {
  return v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function title(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Horizontal 0–100 gauge with 30/70 zone markers and a dot at the current value. */
function RsiGauge({ value, signal }: { value: number; signal: StockTechnicals["rsi_signal"] }) {
  const pos = Math.max(0, Math.min(100, value));
  const tone = rsiTone(signal);
  return (
    <div>
      <div className="ui-caption mb-2 flex items-baseline justify-between tabular-nums">
        <span>Oversold ≤30</span>
        <span className={`text-base font-semibold ${TONE_TEXT[tone]}`}>
          {value.toFixed(1)} · {title(signal)}
        </span>
        <span>Overbought ≥70</span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-success-500/70 via-gray-300 to-error-500/70 dark:via-white/10">
        <div className="absolute inset-y-0 w-px bg-gray-400/70 dark:bg-white/30" style={{ left: "30%" }} aria-hidden="true" />
        <div className="absolute inset-y-0 w-px bg-gray-400/70 dark:bg-white/30" style={{ left: "70%" }} aria-hidden="true" />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500 shadow-theme-sm dark:border-gray-900"
          style={{ left: `${pos}%` }}
          title={`RSI (14): ${value.toFixed(1)}`}
        />
      </div>
    </div>
  );
}

export function TechnicalsCard({ technicals: t, className }: { technicals: StockTechnicals; className?: string }) {
  const tone = trendTone(t.trend);
  const TrendIcon = t.trend === "uptrend" ? TrendingUp : t.trend === "downtrend" ? TrendingDown : ArrowRightLeft;

  return (
    <ChatCard
      title="Technicals"
      icon={Activity}
      description="Trend, momentum and volatility from 1y of daily closes"
      className={className}
      aside={<span className={TONE_BADGE[tone]}>{title(t.trend)}</span>}
    >
      <div className="space-y-5">
        {/* Trend hero */}
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
          <span className={`ui-icon-box h-10 w-10 shrink-0 ${TONE_TEXT[tone]} bg-white dark:bg-white/5`}>
            <TrendIcon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`text-lg font-bold ${TONE_TEXT[tone]}`}>{title(t.trend)}</p>
            {t.trend_detail && <p className="ui-caption mt-0.5">{t.trend_detail}</p>}
            <div className="ui-caption mt-2 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
              <span>
                50 DMA <span className="font-medium text-gray-900 dark:text-white/90">{fmtNum(t.sma_50)}</span>{" "}
                <span className={pctStyle(t.price_vs_sma50_pct)}>({signedPct(t.price_vs_sma50_pct)})</span>
              </span>
              <span>
                200 DMA <span className="font-medium text-gray-900 dark:text-white/90">{fmtNum(t.sma_200)}</span>{" "}
                <span className={pctStyle(t.price_vs_sma200_pct)}>({signedPct(t.price_vs_sma200_pct)})</span>
              </span>
            </div>
          </div>
        </div>

        {/* RSI gauge */}
        {t.rsi_14 != null && (
          <div>
            <p className="ui-label mb-1">RSI (14)</p>
            <RsiGauge value={t.rsi_14} signal={t.rsi_signal} />
          </div>
        )}

        {/* Secondary indicators */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile label="EMA 20" value={fmtNum(t.ema_20)} />
          <MetricTile label="EMA 50" value={fmtNum(t.ema_50)} />
          <div className="ui-tile min-w-0">
            <p className="ui-label truncate">MACD</p>
            <p className={`mt-1 truncate text-base font-semibold tabular-nums ${TONE_TEXT[macdTone(t.macd_trend)]}`}>
              {title(t.macd_trend)}
            </p>
            <p className="ui-caption mt-0.5 truncate tabular-nums">
              {fmtNum(t.macd, 3)} / sig {fmtNum(t.macd_signal, 3)}
            </p>
          </div>
          <MetricTile
            label="Bollinger"
            value={t.bb_position_pct != null ? `${t.bb_position_pct.toFixed(0)}% of band` : "—"}
            sub={bbLabel(t.bb_signal)}
          />
          <MetricTile label="BB Upper / Lower" value={fmtNum(t.bb_upper)} sub={`lower ${fmtNum(t.bb_lower)}`} />
          <MetricTile label="ATR (14)" value={fmtNum(t.atr_14)} sub="avg daily range" />
        </div>
      </div>
    </ChatCard>
  );
}
