'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthCallbackView from '@/app/auth/callback/_components/AuthCallbackView';

export default function AuthCallbackController() {
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

    void completeSignIn();
  }, [router, searchParams]);

  return <AuthCallbackView message="Memproses login Google..." />;
}
