import { createClient } from '@supabase/supabase-js';
import { DEVELOPMENT_ACCESS_TOKEN, DEVELOPMENT_USER_ID } from '@/lib/devAuth';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

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

async function resolveDevelopmentUserId() {
  const configuredUserId = getConfiguredDevelopmentUserId();
  if (configuredUserId) return configuredUserId;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;

    const existingUserId = data.users[0]?.id;
    if (existingUserId && UUID_PATTERN.test(existingUserId)) {
      return existingUserId;
    }
  } catch {
    return DEVELOPMENT_USER_ID;
  }

  return DEVELOPMENT_USER_ID;
}

export async function resolveRequestUserId(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;

  if (process.env.NODE_ENV === 'development' && token === DEVELOPMENT_ACCESS_TOKEN) {
    return resolveDevelopmentUserId();
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
