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
import PersonIcon from '@mui/icons-material/Person';
import GoogleIcon from '@mui/icons-material/Google';
import AuthShell from '@/components/auth/AuthShell';
import type { RegisterForm } from '@/controllers/register/useRegisterController';

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
        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('fullName')}
              variant="outlined"
              fullWidth
              required
              autoComplete="name"
              disabled={loading || googleLoading}
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
              type="email"
              variant="outlined"
              fullWidth
              required
              autoComplete="email"
              disabled={loading || googleLoading}
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
              required
              autoComplete="new-password"
              disabled={loading || googleLoading}
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
                      <IconButton onClick={togglePassword} edge="end" size="small" disabled={loading || googleLoading}>
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
              required
              autoComplete="new-password"
              disabled={loading || googleLoading}
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
                      <IconButton onClick={toggleConfirmPassword} edge="end" size="small" disabled={loading || googleLoading}>
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
          {googleLoading ? t('processing') : t('google')}
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
