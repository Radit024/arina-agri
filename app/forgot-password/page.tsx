'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircle';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email('email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth.forgot');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema.extend({
      email: z.string().email(t('validation.email')),
    })),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (authError) throw authError;
      setSuccess(true);
    } catch (err) {
      const message = (err as any)?.message || t('error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      {/* Left panel */}
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: 'primary.light', opacity: 0.1 }} />
        <Box sx={{ position: 'absolute', bottom: -150, right: -100, width: 500, height: 500, borderRadius: '50%', bgcolor: 'primary.dark', opacity: 0.2 }} />
        <Box component="img" src="/logo%20arina.svg" alt="Arina Agri Logo" sx={{ width: 80, height: 80, mb: 2, zIndex: 1, filter: 'brightness(0) invert(1)' }} />
        <Typography variant="h3" sx={{ fontFamily: 'var(--font-sora)', zIndex: 1, textAlign: 'center', fontWeight: 800 }}>
          Arina Agri
        </Typography>
        <Typography variant="h6" sx={{ mt: 2, opacity: 0.9, textAlign: 'center', maxWidth: 400, zIndex: 1 }}>
          Asisten Cerdas Petani & Pelaku Agribisnis UMKM Indonesia
        </Typography>
      </Grid>

      {/* Right panel */}
      <Grid
        size={{ xs: 12, md: 6 }}
        component={Paper}
        elevation={0}
        square
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6, md: 8 } }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {success ? (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, mb: 1 }}>
                {t('success.title')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {t('success.desc')}
              </Typography>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="contained" fullWidth sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
                  {t('success.button')}
                </Button>
              </Link>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', mb: 1, color: 'text.primary', fontWeight: 700 }}>
                  {t('title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('subtitle')}
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('email')}
                      variant="outlined"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailOutlinedIcon color="action" />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 2, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : t('submit')}
                </Button>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Link href="/login" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      {t('back')}
                    </Typography>
                  </Link>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
