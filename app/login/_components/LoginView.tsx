import { Controller, type Control, type FieldErrors, type SubmitHandler, type UseFormHandleSubmit } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
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
  redirecting: boolean;
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
  redirecting,
  showPassword,
  t,
  togglePassword,
}: LoginViewProps) {
  const busy = loading || googleLoading || redirecting;
  const submitLabel = redirecting ? t('preparingDashboard') : t('processing');

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

      {redirecting && (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'success.light',
            bgcolor: 'rgba(46, 125, 50, 0.08)',
            color: 'success.dark',
            animation: 'loginLoadingPulse 1.4s ease-in-out infinite',
            '@keyframes loginLoadingPulse': {
              '0%, 100%': { opacity: 0.82, transform: 'translateY(0)' },
              '50%': { opacity: 1, transform: 'translateY(-2px)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        >
          <LinearProgress color="success" aria-hidden sx={{ mb: 1.5, borderRadius: 999 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('preparingDashboard')}
          </Typography>
        </Box>
      )}

      <Box
        component="form"
        aria-label={t('formLabel')}
        aria-busy={busy}
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
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
              disabled={busy}
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
              disabled={busy}
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
                      <IconButton onClick={togglePassword} edge="end" size="small" disabled={busy}>
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
          disabled={busy}
          sx={{ mt: 2, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1rem' }}
        >
          {loading || redirecting ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" aria-label={submitLabel} />
              <span>{submitLabel}</span>
            </Box>
          ) : t('submit')}
        </Button>

        <Button
          type="button"
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={busy}
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
