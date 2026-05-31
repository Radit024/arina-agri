import { createClient } from '@supabase/supabase-js';
import { DEVELOPMENT_ACCESS_TOKEN, DEVELOPMENT_USER_ID } from '@/lib/devAuth';

export function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function resolveRequestUserId(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;

  if (process.env.NODE_ENV === 'development' && token === DEVELOPMENT_ACCESS_TOKEN) {
    return DEVELOPMENT_USER_ID;
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
