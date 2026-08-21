'use client';

import * as React from 'react';
import Chip, { type ChipProps } from '@mui/material/Chip';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { accentText, softBg, softHoverBg, softText } from '@/lib/themeColors';

export type StatusIntent = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
export type StatusBadgeMode = 'badge' | 'chip';

export interface StatusBadgeProps extends Omit<ChipProps, 'color' | 'variant'> {
  intent?: StatusIntent;
  mode?: StatusBadgeMode;
  selected?: boolean;
  dataTouchTarget?: string;
}

export function StatusBadge({
  intent = 'neutral',
  mode = 'badge',
  selected = false,
  dataTouchTarget = '44',
  label,
  icon,
  onClick,
  sx,
  ...props
}: StatusBadgeProps) {
  const theme = useTheme();
  const isInteractive = Boolean(onClick) || mode === 'chip';

  const getIntentStyles = (): SxProps<Theme> => {
    if (intent === 'neutral') {
      const isDark = theme.palette.mode === 'dark';
      if (selected) {
        return {
          bgcolor: isDark ? 'grey.700' : 'grey.800',
          color: isDark ? 'grey.50' : 'common.white',
          borderColor: 'transparent',
        };
      }
      return {
        bgcolor: isDark ? alpha(theme.palette.grey[500], 0.14) : alpha(theme.palette.grey[500], 0.1),
        color: isDark ? 'grey.300' : 'grey.700',
        borderColor: isDark ? alpha(theme.palette.grey[600], 0.25) : alpha(theme.palette.grey[400], 0.3),
      };
    }

    const paletteIntent = intent;
    if (selected) {
      return {
        bgcolor: `${paletteIntent}.main`,
        color: accentText(theme, paletteIntent),
        borderColor: `${paletteIntent}.main`,
        '&:hover': {
          bgcolor: `${paletteIntent}.dark`,
        },
      };
    }

    return {
      bgcolor: softBg(theme, paletteIntent, 0.14),
      color: softText(theme, paletteIntent),
      borderColor: alpha(theme.palette[paletteIntent].main, 0.25),
      '&:hover': isInteractive
        ? {
            bgcolor: softHoverBg(theme, paletteIntent),
            borderColor: `${paletteIntent}.main`,
            color: softText(theme, paletteIntent),
          }
        : undefined,
    };
  };

  const intentSx = getIntentStyles();

  return (
    <Chip
      {...props}
      label={label}
      icon={icon}
      onClick={onClick}
      data-touch-target={isInteractive ? dataTouchTarget : undefined}
      sx={[
        {
          fontWeight: mode === 'chip' ? 600 : 700,
          fontSize: mode === 'chip' ? '0.85rem' : '0.75rem',
          height: mode === 'chip' ? 40 : 'auto',
          minHeight: mode === 'chip' ? 40 : 24,
          py: mode === 'chip' ? 0.5 : 0.25,
          px: mode === 'chip' ? 1 : 0.5,
          borderRadius: mode === 'chip' ? 2 : 1.5,
          border: '1px solid',
          cursor: isInteractive ? 'pointer' : 'default',
          transition: 'all 0.18s ease-out',
          userSelect: 'none',
          '& .MuiChip-label': {
            px: mode === 'chip' ? 1.25 : 0.75,
            py: 0,
            lineHeight: 1.2,
          },
          '& .MuiChip-icon': {
            ml: 0.75,
            mr: -0.25,
            fontSize: mode === 'chip' ? 18 : 14,
            color: 'inherit',
          },
        },
        ...(Array.isArray(intentSx) ? intentSx : [intentSx]),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}

export const StatusChip = (props: StatusBadgeProps) => <StatusBadge mode="chip" {...props} />;

export default StatusBadge;
