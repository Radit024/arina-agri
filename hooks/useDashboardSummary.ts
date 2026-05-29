'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardSummary } from '@/lib/dashboard/summary';

interface DashboardSummaryParams {
  adm4?: string;
  locationLabel?: string;
}

interface DashboardSummaryEnvelope {
  success?: boolean;
  message?: string;
  data?: DashboardSummary;
}

export function buildDashboardSummaryUrl(params: DashboardSummaryParams) {
  const search = new URLSearchParams();
  const adm4 = params.adm4?.trim();
  const locationLabel = params.locationLabel?.trim();

  if (adm4) search.set('adm4', adm4);
  if (locationLabel) search.set('locationLabel', locationLabel);

  const query = search.toString();
  return `/api/dashboard/summary${query ? `?${query}` : ''}`;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  if (process.env.NODE_ENV === 'development') {
    return { Authorization: 'Bearer mock-token' };
  }

  return {};
}

export function useDashboardSummary(params: DashboardSummaryParams) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { adm4, locationLabel } = params;
  const requestUrl = useMemo(
    () => buildDashboardSummaryUrl({ adm4, locationLabel }),
    [adm4, locationLabel]
  );

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(requestUrl, {
        headers,
        cache: 'no-store',
        signal,
      });
      const json = (await response.json()) as DashboardSummaryEnvelope;

      if (signal?.aborted) return;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.message || `HTTP error ${response.status}`);
      }

      setSummary(json.data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard');
      setSummary(null);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [requestUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void loadData(controller.signal);
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  return {
    summary,
    loading,
    error,
    reload: loadData,
  };
}
