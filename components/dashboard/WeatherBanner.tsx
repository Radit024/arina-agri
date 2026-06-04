'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { softBg, softText } from '@/lib/themeColors';

interface WeatherBannerProps {
  message?: string;
}

export default function WeatherBanner({ message }: WeatherBannerProps) {
  const theme = useTheme();
  const t = useTranslations('Dashboard.weatherBanner');
  const alertMessage = message?.trim();

  if (!alertMessage) return null;

  return (
    <Box
      sx={{
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        backgroundColor: softBg(theme, 'warning', 0.14),
        border: '1px solid',
        borderColor: alpha(theme.palette.warning.main, 0.28),
        boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.1)}`,
      }}
    >
      <Box 
        sx={{ 
          bgcolor: 'background.paper', 
          borderRadius: '50%', 
          p: 0.5, 
          display: 'flex', 
          boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.05)}`,
          color: softText(theme, 'warning')
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: softText(theme, 'warning'), display: 'block', mb: 0.25, fontFamily: 'var(--font-sora)', fontSize: '0.75rem' }}>
          {t('title')}
        </Typography>
        <Typography variant="caption" sx={{ color: softText(theme, 'warning'), lineHeight: 1.4, fontSize: '0.7rem', display: 'block' }}>
          {alertMessage}
        </Typography>
      </Box>
    </Box>
  );
}
