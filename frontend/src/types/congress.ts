export interface Trader {
  name: string;
  last_name: string;
}

export interface CongressTrade {
  politician: string;
  owner: string | null;
  asset: string;
  ticker: string | null;
  asset_type: string | null;
  transaction_type: "purchase" | "sale" | "sale_partial" | "exchange" | string;
  transaction_date: string | null;
  amount_min: number | null;
  amount_max: number | null;
  amount_label: string;
  description: string | null;
  filing_date: string;
  pdf_url: string;
}

export interface CongressTradesData {
  query: string;
  filer: string;
  trades: CongressTrade[];
}
