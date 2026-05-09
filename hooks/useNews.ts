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
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const url = `${baseUrl}/news?limit=${limit}&page=${page}`;
        
        const res = await fetch(url);
        const json = await res.json();

        if (!isMounted) return;

        if (!res.ok || !json.success) {
          throw new Error(json.message || `HTTP error ${res.status}`);
        }

        setArticles(json.data || []);
        setTotal(json.total || 0);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Gagal memuat berita';
        console.error('[useNews] Error:', message);
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
