import { createClient } from '@supabase/supabase-js';
import { DEVELOPMENT_ACCESS_TOKEN, DEVELOPMENT_USER_ID, parseDevelopmentAccessToken } from '@/lib/devAuth';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function getConfiguredDevelopmentUserId() {
  const candidates = [
    process.env.DEV_USER_ID,
    process.env.DEVELOPMENT_USER_ID,
    process.env.NEXT_PUBLIC_DEV_USER_ID,
  ];

  return candidates.find((candidate) => candidate && UUID_PATTERN.test(candidate.trim()))?.trim() ?? null;
}

function resolveDevelopmentUserId() {
  const configuredUserId = getConfiguredDevelopmentUserId();
  if (configuredUserId) return configuredUserId;

  return DEVELOPMENT_USER_ID;
}

export async function resolveRequestUserId(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;

  if (process.env.NODE_ENV === 'development') {
    const localDevelopmentUserId = parseDevelopmentAccessToken(token);
    if (localDevelopmentUserId) return localDevelopmentUserId;

    if (token === DEVELOPMENT_ACCESS_TOKEN) {
      return resolveDevelopmentUserId();
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
