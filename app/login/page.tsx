'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
import GoogleIcon from '@mui/icons-material/Google';
import SpaOutlinedIcon from '@mui/icons-material/SpaOutlined';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const googleProvider = new GoogleAuthProvider();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      // For now, mock a successful login if using dummy credentials
      // Or uncomment this to use actual Firebase
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'mock-api-key') {
         await signInWithEmailAndPassword(auth, data.email, data.password);
      } else {
         // Mock login delay
         await new Promise(resolve => setTimeout(resolve, 1000));
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'mock-api-key') {
        await signInWithPopup(auth, googleProvider);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal masuk dengan Google. Silakan coba lagi.');
    } finally {
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle background decoration */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -100, 
            left: -100, 
            width: 400, 
            height: 400, 
            borderRadius: '50%', 
            bgcolor: 'primary.light', 
            opacity: 0.1 
          }} 
        />
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: -150, 
            right: -100, 
            width: 500, 
            height: 500, 
            borderRadius: '50%', 
            bgcolor: 'primary.dark', 
            opacity: 0.2 
          }} 
        />

        <SpaOutlinedIcon sx={{ fontSize: 80, mb: 2, zIndex: 1 }} />
        <Typography variant="h3" sx={{ fontFamily: 'var(--font-sora)', zIndex: 1, textAlign: 'center', fontWeight: 800 }}>
          Arina Agri
        </Typography>
        <Typography variant="h6" sx={{ mt: 2, opacity: 0.9, textAlign: 'center', maxWidth: 400, zIndex: 1 }}>
          Asisten Cerdas Petani & Pelaku Agribisnis UMKM Indonesia
        </Typography>
      </Grid>

      {/* Right Panel - Login Form */}
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
              Selamat Datang Kembali! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Silakan masuk ke akun Anda untuk melanjutkan.
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
                  label="Alamat Email"
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
                  label="Kata Sandi"
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
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    },
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
              <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                  Lupa kata sandi?
                </Typography>
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || googleLoading}
              sx={{ 
                mt: 2, 
                py: 1.5, 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '1rem'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Masuk'}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              startIcon={googleLoading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
              sx={{ 
                py: 1.5, 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '1rem'
              }}
            >
              {googleLoading ? 'Memproses...' : 'Masuk dengan Google'}
            </Button>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Belum punya akun?{' '}
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <Typography component="span" variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                    Daftar Sekarang
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
