'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardSummary } from '@/lib/dashboard/summary';
import { DEVELOPMENT_ACCESS_TOKEN } from '@/lib/devAuth';

interface DashboardSummaryParams {
  adm4?: string;
  accessToken?: string | null;
  enabled?: boolean;
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

export function buildDashboardSummaryHeaders(accessToken?: string | null): Record<string, string> {
  const token = accessToken?.trim();

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  if (process.env.NODE_ENV === 'development') {
    return { Authorization: `Bearer ${DEVELOPMENT_ACCESS_TOKEN}` };
  }

  return {};
}

export function useDashboardSummary(params: DashboardSummaryParams) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, adm4, enabled = true, locationLabel } = params;
  const requestUrl = useMemo(
    () => buildDashboardSummaryUrl({ adm4, locationLabel }),
    [adm4, locationLabel]
  );

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = buildDashboardSummaryHeaders(accessToken);
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
  }, [accessToken, enabled, requestUrl]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    void Promise.resolve().then(() => {
      if (active && !controller.signal.aborted) {
        void loadData(controller.signal);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, loadData]);

  return {
    summary,
    loading,
    error,
    reload: loadData,
  };
}
