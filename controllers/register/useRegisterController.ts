'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const registerSchema = z.object({
  fullName: z.string().min(3, 'name'),
  email: z.string().email('email'),
  password: z.string().min(6, 'password'),
  confirmPassword: z.string().min(6, 'confirm'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'mismatch',
  path: ['confirmPassword'],
});

export type RegisterForm = z.infer<typeof registerSchema>;

export function useRegisterController() {
  const router = useRouter();
  const t = useTranslations('Auth.register');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema.extend({
      fullName: z.string().min(3, t('validation.name')),
      email: z.string().email(t('validation.email')),
      password: z.string().min(6, t('validation.password')),
      confirmPassword: z.string().min(6, t('validation.confirm')),
    }).refine((data) => data.password === data.confirmPassword, {
      message: t('validation.mismatch'),
      path: ['confirmPassword'],
    })),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
        },
      });
      if (authError) throw authError;
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('already registered') ? t('error.exists') : t('error.failed'));
    } finally {
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

  return {
    control: form.control,
    error,
    errors: form.formState.errors,
    googleLoading,
    handleGoogleSignIn,
    handleSubmit: form.handleSubmit,
    loading,
    onSubmit,
    showConfirmPassword,
    showPassword,
    t,
    toggleConfirmPassword: () => setShowConfirmPassword((value) => !value),
    togglePassword: () => setShowPassword((value) => !value),
  };
}
