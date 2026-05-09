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
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        backgroundColor: theme.palette.warning.light,
        border: '1px solid',
        borderColor: alpha(theme.palette.warning.main, 0.2),
        boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.1)}`,
      }}
    >
      <Box 
        sx={{ 
          bgcolor: '#FFFFFF', 
          borderRadius: '50%', 
          p: 0.5, 
          display: 'flex', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          color: theme.palette.warning.dark
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.dark, display: 'block', mb: 0.25, fontFamily: 'var(--font-sora)', fontSize: '0.75rem' }}>
          {t('title')}
        </Typography>
        <Typography variant="caption" sx={{ color: alpha(theme.palette.warning.dark, 0.9), lineHeight: 1.4, fontSize: '0.7rem', display: 'block' }}>
          {message || defaultMessage}
        </Typography>
      </Box>
    </Box>
  );
}
