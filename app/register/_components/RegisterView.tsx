import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonIcon from '@mui/icons-material/Person';
import GoogleIcon from '@mui/icons-material/Google';
import AuthShell from '@/components/auth/AuthShell';
import type { RegisterForm } from '@/controllers/register/useRegisterController';
import { Control, FieldErrors, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form';

import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';

type AuthTranslator = (key: string, values?: Record<string, string | number>) => string;

interface RegisterViewProps {
  control: Control<RegisterForm>;
  error: string | null;
  errors: FieldErrors<RegisterForm>;
  googleLoading: boolean;
  handleGoogleSignIn: () => void;
  handleSubmit: UseFormHandleSubmit<RegisterForm>;
  loading: boolean;
  onSubmit: SubmitHandler<RegisterForm>;
  showConfirmPassword: boolean;
  showPassword: boolean;
  t: AuthTranslator;
  toggleConfirmPassword: () => void;
  togglePassword: () => void;
}

export default function RegisterView({
  control,
  error,
  errors,
  googleLoading,
  handleGoogleSignIn,
  handleSubmit,
  loading,
  onSubmit,
  showConfirmPassword,
  showPassword,
  t,
  toggleConfirmPassword,
  togglePassword,
}: RegisterViewProps) {
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
        <FormInput
          name="fullName"
          control={control}
          label={t('fullName')}
          autoComplete="name"
          disabled={loading || googleLoading}
          error={errors.fullName?.message}
          startIcon={<PersonIcon color="action" />}
        />

        <FormInput
          name="email"
          control={control}
          label={t('email')}
          type="email"
          autoComplete="email"
          disabled={loading || googleLoading}
          error={errors.email?.message}
          startIcon={<EmailOutlinedIcon color="action" />}
        />

        <FormInput
          name="password"
          control={control}
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          disabled={loading || googleLoading}
          error={errors.password?.message}
          startIcon={<LockOutlinedIcon color="action" />}
          endIcon={
            <IconButton onClick={togglePassword} edge="end" size="small" disabled={loading || googleLoading}>
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          }
        />

        <FormInput
          name="confirmPassword"
          control={control}
          label={t('confirmPassword')}
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          disabled={loading || googleLoading}
          error={errors.confirmPassword?.message}
          startIcon={<LockOutlinedIcon color="action" />}
          endIcon={
            <IconButton onClick={toggleConfirmPassword} edge="end" size="small" disabled={loading || googleLoading}>
              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          }
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading || googleLoading}
          loading={loading}
          loadingText={t('submit')}
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
          disabled={loading || googleLoading}
          loading={googleLoading}
          loadingText={t('processing')}
          startIcon={!googleLoading && <GoogleIcon />}
        >
          {t('google')}
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
    </AuthShell>
  );
}
