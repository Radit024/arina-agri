'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Typography from '@mui/material/Typography';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslations } from 'next-intl';

interface WeatherBannerProps {
  message?: string;
}

export default function WeatherBanner({ message }: WeatherBannerProps) {
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
        borderColor: 'warning.light',
        backgroundColor: '#fffbeb',
        '& .MuiAlert-icon': { color: '#f59e0b' },
      }}
    >
      <AlertTitle sx={{ fontWeight: 600, color: '#92400e' }}>{t('title')}</AlertTitle>
      <Typography variant="body2" color="#78350f">
        {message || defaultMessage}
      </Typography>
    </Alert>
  );
}
