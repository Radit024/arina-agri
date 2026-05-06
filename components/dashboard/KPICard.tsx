'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme, alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

type ColorVariant = 'success' | 'warning' | 'error' | 'info';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color?: ColorVariant;
  trend?: { value: string; positive: boolean };
}

export default function KPICard({ title, value, subtitle, icon, color = 'success', trend }: KPICardProps) {
  const theme = useTheme();
  const colorValue = theme.palette[color].main;
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: colorValue,
          opacity: 0.06,
        }}
      />
      <CardContent sx={{ p: 2.5 }}>
        <Box className="flex items-start justify-between">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ mt: 0.5, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2, fontWeight: 700 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Typography
                variant="caption"
                sx={{ color: trend.positive ? 'success.main' : 'error.main', fontWeight: 600, mt: 0.5, display: 'block' }}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              backgroundColor: alpha(colorValue, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Box sx={{ position: 'absolute', color: colorValue }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
