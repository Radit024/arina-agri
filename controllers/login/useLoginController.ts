'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('email'),
  password: z.string().min(6, 'password'),
});

export type LoginForm = z.infer<typeof loginSchema>;

export function useLoginController() {
  const router = useRouter();
  const t = useTranslations('Auth.login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [loginRedirecting, setLoginRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, loading: authLoading, startLocalSession } = useAuth();
  const redirecting = loginRedirecting || (!authLoading && Boolean(user));
  const localLoginEnabled = true;

  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema.extend({
      email: z.string().email(t('validation.email')),
      password: z.string().min(6, t('validation.password')),
    })),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;

      if (authData.session?.access_token && typeof document !== 'undefined') {
        const maxAge = authData.session.expires_in ?? 604800;
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `sb-access-token=${authData.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
      }

      setLoginRedirecting(true);
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('Invalid login credentials') ? t('error.invalid') : t('error.failed'));
      setLoginRedirecting(false);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failed'));
      setGoogleLoading(false);
    }
  };

  const handleLocalSignIn = async () => {
    if (!localLoginEnabled) return;

    setLocalLoading(true);
    setError(null);
    try {
      await startLocalSession();
      setLoginRedirecting(true);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failed'));
      setLoginRedirecting(false);
      setLocalLoading(false);
    }
  };

  return {
    control: form.control,
    error,
    errors: form.formState.errors,
    googleLoading,
    handleGoogleSignIn,
    handleLocalSignIn,
    handleSubmit: form.handleSubmit,
    localLoading,
    localLoginEnabled,
    loading,
    onSubmit,
    redirecting,
    showPassword,
    t,
    togglePassword: () => setShowPassword((value) => !value),
  };
}
