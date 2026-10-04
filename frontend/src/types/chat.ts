// =========================================================
// Shared types/helpers for macro + smart-money components
// =========================================================
export type CpiPoint = { date: string; value: number };
export type CpiReportProps = {
  date: string | null;
  headline_yoy: number | null;
  headline_mom: number | null;
  core_yoy: number | null;
  value: number | null;
  history: CpiPoint[];
  trend: string;
  error: string | null;
};

export type YieldRow = {
  symbol: string;
  name: string;
  maturity_years: number | null;
  yield_pct: number | null;
  change_bps: number | null;
  month_ago_yield_pct: number | null;
};

export type EconEvent = {
  title: string;
  date: string;
  impact: string;
  forecast: string | null;
  previous: string | null;
};

export type SmartMoneySignal = {
  issuer: string;
  action: string;
  fund_count: number;
  combined_value_change: number;
};

export type SmartMoneyFund = {
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

export type SmartMoneyCongress = {
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
