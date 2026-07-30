'use client';

import { supabase } from '@/lib/supabase';
import { buildDevelopmentAccessToken, readLocalDevelopmentUserId } from '@/lib/devAuth';
import type { AnalyticsFeature } from './recordEvent';

async function buildAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  const localUserId = readLocalDevelopmentUserId();
  if (localUserId) {
    return { Authorization: `Bearer ${buildDevelopmentAccessToken(localUserId)}` };
  }

  return {};
}

export async function trackPageView(feature: AnalyticsFeature): Promise<void> {
  try {
    const authHeader = await buildAuthHeader();
    if (!authHeader.Authorization) return;

    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[trackPageView] Gagal mencatat page view:', error);
  }
}
