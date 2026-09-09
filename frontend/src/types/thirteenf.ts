export interface Fund {
  name: string;
  cik: string;
}

export interface Holding {
  rank: number;
  issuer: string;
  cusip: string;
  value_usd: number;
  shares: number;
  pct_of_portfolio: number;
}

export interface HoldingsData {
  fund_name: string;
  cik: string;
  accession_number: string;
  filing_date: string | null;
  period_of_report: string | null;
  total_value_usd: number;
  holdings: Holding[];
}

export interface Transaction {
  issuer: string;
  cusip: string;
  action: "new_buy" | "add" | "trim" | "exit";
  shares_prev: number;
  shares_latest: number;
  shares_change: number;
  value_prev: number;
  value_latest: number;
  value_change: number;
  pct_of_portfolio: number;
}

export interface TransactionsData {
  fund_name: string;
  cik: string;
  latest_filing_date: string | null;
  latest_period: string | null;
  prev_filing_date: string | null;
  prev_period: string | null;
  transactions: Transaction[];
}
