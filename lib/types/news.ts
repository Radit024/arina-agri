export interface NewsArticle {
  id: string;
  title: string;
  snippet: string | null;
  link: string;
  source: string | null;
  image_url: string | null;
  pub_date: string;
  created_at: string;
}

export interface UseNewsResult {
  articles: NewsArticle[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
