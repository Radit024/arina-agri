'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color?: string;
  trend?: { value: string; positive: boolean };
}

export default function KPICard({ title, value, subtitle, icon, color = '#16a34a', trend }: KPICardProps) {
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
          backgroundColor: color,
          opacity: 0.06,
        }}
      />
      <CardContent sx={{ p: 2.5 }}>
        <Box className="flex items-start justify-between">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ mt: 0.5, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2 }}
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
              backgroundColor: color,
              opacity: 0.12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Box sx={{ position: 'absolute', color: color }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
