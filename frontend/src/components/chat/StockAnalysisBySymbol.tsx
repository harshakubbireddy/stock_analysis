"use client";

import { BarChart3, CalendarClock, Gauge, Scale, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { StockAnalysisProps } from "@/types/stockAnalysis";
import { ChatCard } from "./ChatCard";
import { fmtBigMoney, fmtCompact, fmtNum, fmtPct, fmtRatioPct, pctStyle } from "./formatters";
import { AnalystTargetsBar, FiftyTwoWeekRange, MetricTile, MiniSparkline, RecommendationBars } from "./StockAnalysisCharts";
import { FinancialsSection } from "./StockFinancials";

// =========================================================
// Stock Analysis by Symbol — full deep-dive card
// =========================================================
export function StockAnalysisBySymbol(propsRaw: Record<string, unknown>) {
  const props = propsRaw as unknown as StockAnalysisProps;

  if (props.error) {
    return (
      <div className="ui-card p-6">
        <p className="ui-caption">{props.error}</p>
      </div>
    );
  }

  const cur = props.currency || "";
  const up = (props.change ?? 0) >= 0;
  const consensus = props.recommendations.consensus;
  const consensusCls = consensus.toLowerCase().includes("buy")
    ? "ui-badge ui-badge-success"
    : consensus.toLowerCase().includes("sell")
      ? "ui-badge ui-badge-error"
      : "ui-badge ui-badge-warning";
  const meta = [props.exchange, props.sector, props.industry, props.country].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
      {/* Header card — full width */}
      <section className="ui-card p-5 xl:col-span-2 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white/90">
                {props.name}
              </h3>
              <span className="ui-badge ui-badge-brand font-semibold">{props.symbol}</span>
              <span className={consensusCls}>{consensus}</span>
            </div>
            {meta && <p className="ui-caption mt-1">{meta}</p>}
          </div>
          <div className="text-right">
            <p className="ui-metric">
              {fmtNum(props.price)} <span className="text-base font-medium text-gray-500">{cur}</span>
            </p>
            <p className={`flex items-center justify-end gap-1 text-sm font-semibold tabular-nums ${pctStyle(props.change_percent)}`}>
              {up ? <TrendingUp size={15} aria-hidden="true" /> : <TrendingDown size={15} aria-hidden="true" />}
              {fmtNum(Math.abs(props.change ?? 0))} ({up ? "+" : ""}
              {fmtPct(props.change_percent)})
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {props.sparkline_1mo.length > 1 && (
            <div>
              <p className="ui-label mb-1">1-month trend</p>
              <MiniSparkline points={props.sparkline_1mo} />
            </div>
          )}
          <FiftyTwoWeekRange {...props} />
        </div>

        {props.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {props.description}
          </p>
        )}
      </section>

      {/* Key metrics */}
      <ChatCard title="Key Metrics" icon={Gauge} description="Valuation, volume and dividends">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile label="Market Cap" value={fmtBigMoney(props.market_cap)} />
          <MetricTile label="Volume" value={fmtCompact(props.volume)} sub={`avg ${fmtCompact(props.avg_volume)}`} />
          <MetricTile label="P/E (TTM)" value={fmtNum(props.trailing_pe)} sub={`fwd ${fmtNum(props.forward_pe)}`} />
          <MetricTile label="PEG" value={fmtNum(props.peg_ratio)} />
          <MetricTile label="P/B" value={fmtNum(props.price_to_book)} />
          <MetricTile label="P/S" value={fmtNum(props.price_to_sales)} />
          <MetricTile label="EPS (TTM)" value={fmtNum(props.eps_trailing)} sub={`fwd ${fmtNum(props.eps_forward)}`} />
          <MetricTile label="Beta" value={fmtNum(props.beta)} />
          <MetricTile label="Div Yield" value={fmtPct(props.dividend_yield)} sub={`${fmtNum(props.dividend_rate)} rate`} />
          <MetricTile label="Payout" value={fmtPct(props.payout_ratio)} />
          <MetricTile label="Day Range" value={`${fmtNum(props.day_low)}–${fmtNum(props.day_high)}`} />
          <MetricTile label="50 / 200 DMA" value={fmtNum(props.fifty_day_avg)} sub={`200d ${fmtNum(props.two_hundred_day_avg)}`} />
        </div>
      </ChatCard>

      {/* Analyst section */}
      <ChatCard
        title="Analyst Coverage"
        icon={Target}
        description="Price targets and recommendation mix"
        aside={
          <span className="ui-badge ui-badge-neutral">
            {props.recommendations.num_analysts} analysts
          </span>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="ui-label mb-1">Price targets</p>
            <AnalystTargetsBar {...props} />
          </div>
          <div>
            <p className="ui-label mb-2">Recommendations</p>
            <RecommendationBars {...props} />
          </div>
        </div>
      </ChatCard>

      {/* Growth & Profitability */}
      <ChatCard title="Growth & Profitability" icon={BarChart3}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricTile label="Earnings Growth" value={fmtRatioPct(props.earnings_growth)} />
          <MetricTile label="Revenue Growth" value={fmtRatioPct(props.revenue_growth)} />
          <MetricTile label="Qtrly Earn Growth" value={fmtRatioPct(props.earnings_quarterly_growth)} />
          <MetricTile label="Gross Margin" value={fmtRatioPct(props.gross_margin)} />
          <MetricTile label="Operating Margin" value={fmtRatioPct(props.operating_margin)} />
          <MetricTile label="Profit Margin" value={fmtRatioPct(props.profit_margin)} />
          <MetricTile label="ROE" value={fmtRatioPct(props.return_on_equity)} />
          <MetricTile label="ROA" value={fmtRatioPct(props.return_on_assets)} />
        </div>
      </ChatCard>

      {/* Balance sheet */}
      <ChatCard title="Balance Sheet & Cash Flow" icon={Scale}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricTile label="Total Cash" value={fmtBigMoney(props.total_cash)} />
          <MetricTile label="Total Debt" value={fmtBigMoney(props.total_debt)} />
          <MetricTile label="Debt/Equity" value={fmtNum(props.debt_to_equity)} />
          <MetricTile label="Current Ratio" value={fmtNum(props.current_ratio)} />
          <MetricTile label="Free Cash Flow" value={fmtBigMoney(props.free_cashflow)} />
          <MetricTile label="Operating CF" value={fmtBigMoney(props.operating_cashflow)} />
          <MetricTile label="Short Ratio" value={fmtNum(props.short_ratio)} />
          <MetricTile label="Short % Float" value={fmtRatioPct(props.short_percent_of_float)} />
          <MetricTile label="Enterprise Value" value={fmtBigMoney(props.enterprise_value)} />
        </div>
      </ChatCard>

      {/* Financials — full width */}
      <div className="xl:col-span-2">
        <FinancialsSection financials={props.financials ?? { annual: [], quarterly: [] }} />
      </div>

      {/* Earnings calendar */}
      {props.calendar.earnings_date && (
        <ChatCard title="Next Earnings & Calendar" icon={CalendarClock} className="xl:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricTile label="Earnings Date" value={props.calendar.earnings_date} />
            <MetricTile
              label="EPS Est (Avg)"
              value={fmtNum(props.calendar.eps_estimate_avg)}
              sub={`${fmtNum(props.calendar.eps_estimate_low)}–${fmtNum(props.calendar.eps_estimate_high)}`}
            />
            <MetricTile label="Rev Est (Avg)" value={fmtBigMoney(props.calendar.revenue_estimate_avg)} />
            {props.calendar.ex_dividend_date && (
              <MetricTile label="Ex-Dividend" value={props.calendar.ex_dividend_date} />
            )}
          </div>
        </ChatCard>
      )}
    </div>
  );
}
