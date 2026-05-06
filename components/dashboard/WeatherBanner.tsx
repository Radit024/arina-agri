'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

interface WeatherBannerProps {
  message?: string;
}

export default function WeatherBanner({ message }: WeatherBannerProps) {
  const theme = useTheme();
  const t = useTranslations('Dashboard.weatherBanner');
  const defaultMessage =
    t('defaultMessage');

  return (
    <Alert
      severity="warning"
      icon={<WarningAmberIcon />}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: theme.palette.warning.light,
        backgroundColor: alpha(theme.palette.warning.main, 0.08),
        '& .MuiAlert-icon': { color: theme.palette.warning.main },
      }}
    >
      <AlertTitle sx={{ fontWeight: 600, color: theme.palette.warning.dark }}>{t('title')}</AlertTitle>
      <Typography variant="body2" color={theme.palette.warning.dark}>
        {message || defaultMessage}
      </Typography>
    </Alert>
  );
}
