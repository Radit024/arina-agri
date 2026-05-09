'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme, alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { memo } from 'react';

type ColorVariant = 'success' | 'warning' | 'error' | 'info';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color?: ColorVariant;
  trend?: { value: string; positive: boolean };
  children?: ReactNode;
}

export default memo(function KPICard({ title, value, subtitle, icon, color = 'success', trend, children }: KPICardProps) {
  const theme = useTheme();
  const colorValue = theme.palette[color].main;
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(colorValue, 0.15)} 0%, ${alpha(colorValue, 0)} 70%)`,
        }}
      />
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box className="flex items-start justify-between" sx={{ mb: children ? 3 : 0, flex: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ mt: 1, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2, fontWeight: 700 }}
            >
              {value}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontWeight: 500 }}>
                {subtitle}
              </Typography>
            ) : null}
            {trend ? (
              <Typography
                variant="caption"
                sx={{ 
                  color: trend.positive ? 'success.main' : 'error.main', 
                  fontWeight: 600, 
                  mt: 1, 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: trend.positive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                  px: 1,
                  py: 0.25,
                  borderRadius: 2
                }}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: alpha(colorValue, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: `inset 0 0 0 1px ${alpha(colorValue, 0.1)}`,
              flexShrink: 0,
            }}
          >
            <Box sx={{ position: 'absolute', color: colorValue }}>{icon}</Box>
          </Box>
        </Box>
        {children && (
          <Box sx={{ mt: 'auto' }}>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});
