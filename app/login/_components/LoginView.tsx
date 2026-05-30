import { Controller, type Control, type FieldErrors, type SubmitHandler, type UseFormHandleSubmit } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
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
import AuthShell from '@/components/auth/AuthShell';
import type { LoginForm } from '@/controllers/login/useLoginController';

type AuthTranslator = (key: string, values?: Record<string, string | number>) => string;

interface LoginViewProps {
  control: Control<LoginForm>;
  error: string | null;
  errors: FieldErrors<LoginForm>;
  googleLoading: boolean;
  handleGoogleSignIn: () => void;
  handleSubmit: UseFormHandleSubmit<LoginForm>;
  loading: boolean;
  onSubmit: SubmitHandler<LoginForm>;
  showPassword: boolean;
  t: AuthTranslator;
  togglePassword: () => void;
}

export default function LoginView({
  control,
  error,
  errors,
  googleLoading,
  handleGoogleSignIn,
  handleSubmit,
  loading,
  onSubmit,
  showPassword,
  t,
  togglePassword,
}: LoginViewProps) {
  return (
    <AuthShell brandSubtitle={t('branding')}>
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
              autoComplete="email"
              inputMode="email"
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
              autoComplete="current-password"
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
                      <IconButton onClick={togglePassword} edge="end" size="small">
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
              {t('forgotPassword')}
            </Typography>
          </Link>
        </Box>

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
          {googleLoading ? t('processing') : t('google')}
        </Button>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('noAccount')}{' '}
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <Typography component="span" variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                {t('registerNow')}
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthShell>
  );
}
