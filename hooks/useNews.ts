'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NewsArticle, UseNewsResult } from '@/lib/types/news';

interface UseNewsOptions {
  limit?: number;
  page?: number;
}

export function useNews({ limit = 10, page = 1 }: UseNewsOptions = {}): UseNewsResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((n) => n + 1), []);

  useEffect(() => {
    let isMounted = true;

    async function fetchNews() {
      setIsLoading(true);
      setError(null);

      try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error: sbError, count } = await supabase
          .from('news_articles')
          .select('*', { count: 'exact' })
          .order('pub_date', { ascending: false })
          .range(from, to);

        if (!isMounted) return;

        if (sbError) {
          console.error('[useNews] Supabase error:', sbError.message);
          setError(sbError.message);
          setArticles([]);
          setTotal(0);
          return;
        }

        const fetched = data as NewsArticle[];
        setArticles(fetched);
        setTotal(count || 0);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Gagal memuat berita';
        setError(message);
        setArticles([]);
        setTotal(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchNews();

    return () => {
      isMounted = false;
    };
  }, [limit, page, trigger]);

  return { articles, total, isLoading, error, refetch };
}
