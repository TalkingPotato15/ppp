export type Trend = 'RISING' | 'STABLE' | 'DECLINING';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface ProblemCard {
  id: string;
  title: string;
  keywords: string[];
  domain_tag: string;
  trend: Trend;
  sentiment: Sentiment;
  posted_at: string;
}

export interface ProblemDetail extends ProblemCard {
  source_url: string;
  created_at: string;
}

export interface ProblemListResponse {
  items: ProblemCard[];
  total: number;
  has_more: boolean;
  limit: number;
  offset: number;
}

export interface ProblemFilters {
  domain?: string;
  trend?: Trend;
  sentiment?: Sentiment;
  keywords?: string;
  sort_by?: 'recent' | 'oldest';
}
