import { type Control, type FieldErrors, type SubmitHandler, type UseFormHandleSubmit } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import AuthShell from '@/components/auth/AuthShell';
import type { LoginForm } from '@/controllers/login/useLoginController';
import { softBg, softText } from '@/lib/themeColors';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';

type AuthTranslator = (key: string, values?: Record<string, string | number>) => string;

interface LoginViewProps {
  control: Control<LoginForm>;
  error: string | null;
  errors: FieldErrors<LoginForm>;
  googleLoading: boolean;
  handleGoogleSignIn: () => void;
  handleLocalSignIn: () => void;
  handleSubmit: UseFormHandleSubmit<LoginForm>;
  localLoading: boolean;
  localLoginEnabled: boolean;
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
  handleLocalSignIn,
  handleSubmit,
  localLoading,
  localLoginEnabled,
  loading,
  onSubmit,
  redirecting,
  showPassword,
  t,
  togglePassword,
}: LoginViewProps) {
  const busy = loading || googleLoading || localLoading || redirecting;
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
          sx={(theme) => ({
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: softText(theme, 'success'),
            bgcolor: softBg(theme, 'success', 0.14),
            color: softText(theme, 'success'),
            animation: 'loginLoadingPulse 1.4s ease-in-out infinite',
            '@keyframes loginLoadingPulse': {
              '0%, 100%': { opacity: 0.82, transform: 'translateY(0)' },
              '50%': { opacity: 1, transform: 'translateY(-2px)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          })}
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
        <FormInput
          name="email"
          control={control}
          label={t('email')}
          type="email"
          variant="outlined"
          fullWidth
          required
          autoComplete="email"
          disabled={busy}
          error={errors.email?.message}
          startIcon={<EmailOutlinedIcon color="action" />}
        />

        <FormInput
          name="password"
          control={control}
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          variant="outlined"
          fullWidth
          required
          autoComplete="current-password"
          disabled={busy}
          error={errors.password?.message}
          startIcon={<LockOutlinedIcon color="action" />}
          endIcon={
            <IconButton
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              onClick={togglePassword}
              edge="end"
              size="small"
              disabled={busy}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          }
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
          <Link href="/forgot-password" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
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
          loading={loading || redirecting}
          loadingText={submitLabel}
          sx={{ mt: 2 }}
        >
          {t('submit')}
        </Button>

        <Button
          type="button"
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          loadingText={t('processing')}
          startIcon={<GoogleIcon />}
        >
          {t('google')}
        </Button>

        {localLoginEnabled && (
          <Button
            type="button"
            variant="text"
            size="large"
            fullWidth
            onClick={handleLocalSignIn}
            loading={localLoading}
            loadingText={t('processing')}
            startIcon={<ComputerOutlinedIcon />}
            sx={{ py: 1.25, fontSize: '0.95rem', minHeight: 44 }}
          >
            {t('localLogin')}
          </Button>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5, minHeight: 44 }}>
            {t('noAccount')}{' '}
            <Link href="/register" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
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
