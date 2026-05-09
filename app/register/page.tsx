'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonIcon from '@mui/icons-material/Person';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

const registerSchema = z.object({
  fullName: z.string().min(3, 'name'),
  email: z.string().email('email'),
  password: z.string().min(6, 'password'),
  confirmPassword: z.string().min(6, 'confirm')
}).refine((data) => data.password === data.confirmPassword, {
  message: "mismatch",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
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

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema.extend({
      fullName: z.string().min(3, t('validation.name')),
      email: z.string().email(t('validation.email')),
      password: z.string().min(6, t('validation.password')),
      confirmPassword: z.string().min(6, t('validation.confirm'))
    }).refine((data) => data.password === data.confirmPassword, {
      message: t('validation.mismatch'),
      path: ["confirmPassword"],
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
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already registered')) {
        setError(t('error.exists'));
      } else {
        setError(t('error.failed'));
      }
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
    } catch (err: any) {
      setError(err.message || t('error.failed'));
      setGoogleLoading(false);
    }
  };

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      {/* Left Panel - Branding */}
      <Grid 
        size={{ xs: 12, md: 6 }} 
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: { xs: 'none', md: 'flex' }, // Hide on mobile to save space
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: 'primary.light', opacity: 0.1 }} />
        <Box sx={{ position: 'absolute', bottom: -150, right: -100, width: 500, height: 500, borderRadius: '50%', bgcolor: 'primary.dark', opacity: 0.2 }} />
        <Box 
          component="img" 
          src="/logo%20arina.svg" 
          alt="Arina Agri Logo" 
          sx={{ width: 80, height: 80, mb: 2, zIndex: 1, filter: 'brightness(0) invert(1)' }} 
        />
        <Typography variant="h3" sx={{ fontFamily: 'var(--font-sora)', zIndex: 1, textAlign: 'center', fontWeight: 800 }}>
          Arina Agri
        </Typography>
        <Typography variant="h6" sx={{ mt: 2, opacity: 0.9, textAlign: 'center', maxWidth: 400, zIndex: 1 }}>
          {t('branding')}
        </Typography>
      </Grid>

      {/* Right Panel - Register Form */}
      <Grid 
        size={{ xs: 12, md: 6 }} 
        component={Paper} 
        elevation={0} 
        square 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: { xs: 3, sm: 6, md: 8 }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
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
              name="fullName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('fullName')}
                  variant="outlined"
                  fullWidth
                  error={!!errors.fullName}
                  helperText={errors.fullName?.message}
                  slotProps={{
                    input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                    },
                  }}
                />
              )}
            />

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

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('password')}
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    },
                  }}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  variant="outlined"
                  fullWidth
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  slotProps={{
                    input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
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
              disabled={loading || googleLoading}
              sx={{ mt: 2, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('submit')}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              startIcon={googleLoading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
              sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem' }}
            >
              {googleLoading ? t('processing' as any) || 'Memproses...' : t('google')}
            </Button>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('hasAccount')}{' '}
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <Typography component="span" variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                    {t('loginNow')}
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
