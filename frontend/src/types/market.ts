export interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  sparkline: number[];
}

export interface MarketOverview {
  usa: MarketQuote[];
  india: MarketQuote[];
  crypto: MarketQuote[];
  usa_sectors: MarketQuote[];
}
