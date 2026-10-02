// Helper HTTP dan autentikasi.

import { supabase } from '@/lib/supabase';
import { buildDevelopmentAccessToken, readLocalDevelopmentUserId } from '@/lib/devAuth';
import type { ApiEnvelope } from './types';

async function resolveCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const localUserId = readLocalDevelopmentUserId();
  if (localUserId) return { id: localUserId };

  return null;
}

async function buildCurrentAuthHeaders(): Promise<Record<string, string>> {
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


async function authenticatedJsonRequest<T>(endpoint: string, init: { method: string; body?: object }): Promise<T> {
  const headers: Record<string, string> = {
    ...(await buildCurrentAuthHeaders()),
  };

  if (init.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const rawText = await response.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.message || rawText || `HTTP error ${response.status}`);
  }

  return json.data as T;
}

function resolveApiUrl(path: string) {
  return path;
}

async function apiFetch<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(resolveApiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || rawText || `HTTP error ${res.status}`);
  }

  if (!json?.success) {
    throw new Error(json?.message || 'Permintaan API gagal.');
  }

  return json.data as T;
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(resolveApiUrl(endpoint));
  const rawText = await res.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || rawText || `HTTP error ${res.status}`);
  }

  if (!json?.success) {
    throw new Error(json?.message || 'Permintaan API gagal.');
  }

  return json.data as T;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };

  // Mode auth lokal dev tidak punya sesi Supabase, sehingga header kosong dan
  // endpoint terlindungi membalas 401. Kirim token dev agar fitur tetap berfungsi.
  if (process.env.NODE_ENV === 'development') {
    const localUserId = readLocalDevelopmentUserId();
    if (localUserId) {
      return { Authorization: `Bearer ${buildDevelopmentAccessToken(localUserId)}` };
    }
  }

  return {};
}


export {
  resolveCurrentUser,
  buildCurrentAuthHeaders,
  buildAuthHeaders,
  authenticatedJsonRequest,
  apiFetch,
  apiGet,
};