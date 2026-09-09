export interface TrendingStock {
  symbol: string;
  name: string;
  price: number | null;
  change_percent: number | null;
  volume: number | null;
}

export interface TrendingData {
  most_active: TrendingStock[];
  gainers: TrendingStock[];
  losers: TrendingStock[];
}
