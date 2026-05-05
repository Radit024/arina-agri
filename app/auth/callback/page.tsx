'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const completeSignIn = async () => {
      let hasSession = false;

      try {
        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('OAuth exchange error:', error.message);
          }
          hasSession = Boolean(data?.session);
        } else {
          const { data } = await supabase.auth.getSession();
          hasSession = Boolean(data?.session);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
      } finally {
        router.replace(hasSession ? '/dashboard' : '/login');
      }
    };

    completeSignIn();
  }, [router, searchParams]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p>Memproses login Google...</p>
    </main>
  );
}
