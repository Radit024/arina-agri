import * as React from 'react';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

export type MetricCardIntent = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface MetricCardTrend {
  value: React.ReactNode;
  positive?: boolean;
}

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  intent?: MetricCardIntent;
  trend?: MetricCardTrend;
  loading?: boolean;
}

const intentColors: Record<MetricCardIntent, string> = {
  primary: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  info: 'info.main',
};

export default function MetricCard({
  label,
  value,
  icon,
  intent = 'primary',
  trend,
  loading = false,
}: MetricCardProps) {
  const trendColor = trend?.positive === true
    ? 'success.main'
    : trend?.positive === false
      ? 'error.main'
      : 'text.secondary';
  const TrendIcon = trend?.positive === true
    ? TrendingUpIcon
    : trend?.positive === false
      ? TrendingDownIcon
      : TrendingFlatIcon;

  return (
    <Card component="section" aria-busy={loading || undefined} aria-label={label} variant="outlined">
      <CardContent sx={{ '&:last-child': { pb: 2.5 }, p: 2.5 }}>
        <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 1.5, justifyContent: 'space-between' }}>
          <Box component="dl" sx={{ m: 0, minWidth: 0 }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Box component="dd" sx={{ m: 0, mt: 0.75 }}>
              {loading ? (
                <Box aria-label={`Memuat ${label}`} role="status">
                  <Skeleton height={38} variant="text" width="60%" />
                </Box>
              ) : (
                <Typography variant="h5" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
                  {value}
                </Typography>
              )}
            </Box>
          </Box>
          {icon && (
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: `${intent}.light`,
                borderRadius: 2,
                color: intentColors[intent],
                display: 'flex',
                flexShrink: 0,
                height: 44,
                justifyContent: 'center',
                width: 44,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        {!loading && trend && (
          <Box sx={{ alignItems: 'center', color: trendColor, display: 'flex', gap: 0.5, mt: 1.5 }}>
            <TrendIcon fontSize="small" />
            <Typography variant="body2">{trend.value}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
