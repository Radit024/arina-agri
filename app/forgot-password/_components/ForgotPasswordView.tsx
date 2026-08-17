import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircle';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import type { ForgotPasswordForm } from '@/controllers/forgot-password/useForgotPasswordController';
import { Control, FieldErrors, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form';

import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';

type AuthTranslator = (key: string, values?: Record<string, string | number>) => string;

interface ForgotPasswordViewProps {
  control: Control<ForgotPasswordForm>;
  error: string | null;
  errors: FieldErrors<ForgotPasswordForm>;
  handleSubmit: UseFormHandleSubmit<ForgotPasswordForm>;
  loading: boolean;
  onSubmit: SubmitHandler<ForgotPasswordForm>;
  success: boolean;
  t: AuthTranslator;
}

export default function ForgotPasswordView({
  control,
  error,
  errors,
  handleSubmit,
  loading,
  onSubmit,
  success,
  t,
}: ForgotPasswordViewProps) {
  return (
    <AuthShell brandSubtitle="Asisten Cerdas Petani & Pelaku Agribisnis UMKM Indonesia" minHeight="100vh">
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
            <FormInput
              name="email"
              control={control}
              label={t('email')}
              type="email"
              autoComplete="email"
              disabled={loading}
              error={errors.email?.message}
              startIcon={<EmailOutlinedIcon color="action" />}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              loading={loading}
              loadingText={t('submit')}
              sx={{ mt: 2 }}
            >
              {t('submit')}
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
    </AuthShell>
  );
}
