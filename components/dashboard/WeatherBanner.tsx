'use client';

import Box from '@mui/material/Box';
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
    <Box
      sx={{
        borderRadius: 4,
        p: 2.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        backgroundColor: theme.palette.warning.light,
        border: '1px solid',
        borderColor: alpha(theme.palette.warning.main, 0.2),
        boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.1)}`,
      }}
    >
      <Box 
        sx={{ 
          bgcolor: '#FFFFFF', 
          borderRadius: '50%', 
          p: 1, 
          display: 'flex', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          color: theme.palette.warning.dark
        }}
      >
        <WarningAmberIcon fontSize="small" />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.warning.dark, mb: 0.5, fontFamily: 'var(--font-sora)' }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" sx={{ color: alpha(theme.palette.warning.dark, 0.8), lineHeight: 1.5 }}>
          {message || defaultMessage}
        </Typography>
      </Box>
    </Box>
  );
}
