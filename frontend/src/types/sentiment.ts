export interface SentimentPoint {
  date: string;
  score: number;
}

export interface SentimentCard {
  label: string;
  value: number | null;
  rating: string;
  source: string;
  history: SentimentPoint[];
  error: string | null;
}

export interface SentimentOverview {
  cards: SentimentCard[];
}

export interface FngComparison {
  label: string;
  date: string;
  score: number;
  rating: string;
}

export interface FngDetail {
  value: number | null;
  rating: string;
  source: string;
  last_updated: string | null;
  comparisons: FngComparison[];
  history: SentimentPoint[];
  error: string | null;
}
