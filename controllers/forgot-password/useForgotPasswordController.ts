'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';

const forgotPasswordSchema = z.object({
  email: z.string().email('email'),
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function useForgotPasswordController() {
  const t = useTranslations('Auth.forgot');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema.extend({
      email: z.string().email(t('validation.email')),
    })),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (authError) throw authError;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return {
    control: form.control,
    error,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit,
    loading,
    onSubmit,
    success,
    t,
  };
}
