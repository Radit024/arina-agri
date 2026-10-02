'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Menukar OAuth `code` dari Google menjadi session Supabase, lalu mengarahkan
 * ke dashboard. Bila code tidak ada (mis. user membuka halaman langsung),
 * session yang sudah ada dipakai apa adanya.
 *
 * Redirect selalu terjadi, termasuk saat pertukaran gagal, supaya user tidak
 * terjebak di layar "memproses" tanpa jalan keluar.
 */
export function useAuthCallbackController() {
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

  return {
    message: 'Memproses login Google...',
  };
}
