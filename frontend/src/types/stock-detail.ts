export interface ChartPoint {
  time: string;
  price: number;
}

export interface StockDetail {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  previous_close: number | null;
  day_high: number | null;
  day_low: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  market_cap: number | null;
  trailing_pe: number | null;
  volume: number | null;
  intraday: ChartPoint[];
}

export interface NewsItem {
  title: string;
  summary: string | null;
  publisher: string | null;
  url: string | null;
  published: string | null;
  symbol: string;
}

export interface NewsFeed {
  items: NewsItem[];
}
