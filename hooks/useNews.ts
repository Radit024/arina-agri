'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NewsArticle, UseNewsResult } from '@/lib/types/news';

interface UseNewsOptions {
  limit?: number;
  page?: number;
  category?: string;
  enabled?: boolean;
}

export function useNews({ limit = 10, page = 1, category = '', enabled = true }: UseNewsOptions = {}): UseNewsResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((n) => n + 1), []);

  useEffect(() => {
    let isMounted = true;

    async function fetchNews() {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use relative path for internal Next.js API route
        const params = new URLSearchParams({
          limit: String(limit),
          page: String(page),
        });
        if (category) params.set('category', category);
        const url = `/api/news?${params.toString()}`;
        
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
  }, [limit, page, category, trigger, enabled]);

  return { articles, total, isLoading, error, refetch };
}
