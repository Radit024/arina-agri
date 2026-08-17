import React from 'react';
import Chip, { ChipProps } from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';

export type BadgeVariant = 'solid' | 'soft' | 'outlined';
export type BadgeColor = 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'default';

export interface BadgeProps extends Omit<ChipProps, 'variant' | 'color'> {
  /**
   * The variant of the badge.
   * @default 'soft'
   */
  variant?: BadgeVariant;
  /**
   * The color of the badge.
   * @default 'default'
   */
  color?: BadgeColor;
}

export default function Badge({
  variant = 'soft',
  color = 'default',
  sx,
  ...props
}: BadgeProps) {
  const theme = useTheme();
  
  const getColors = () => {
    if (color === 'default') {
      if (variant === 'soft') {
        return {
          bgcolor: alpha(theme.palette.grey[500], 0.12),
          color: theme.palette.text.secondary,
          border: 'none',
        };
      }
      if (variant === 'solid') {
        return {
          bgcolor: theme.palette.grey[500],
          color: theme.palette.getContrastText(theme.palette.grey[500]),
          border: 'none',
        };
      }
      return {
        bgcolor: 'transparent',
        color: theme.palette.text.secondary,
        border: `1px solid ${theme.palette.divider}`,
      };
    }

    const paletteColor = theme.palette[color];
    const isDark = theme.palette.mode === 'dark';

    if (variant === 'soft') {
      return {
        bgcolor: alpha(paletteColor.main, 0.14),
        color: isDark ? paletteColor.light : paletteColor.dark,
        border: 'none',
      };
    }
    if (variant === 'solid') {
      return {
        bgcolor: paletteColor.main,
        color: paletteColor.contrastText,
        border: 'none',
      };
    }
    // outlined
    return {
      bgcolor: 'transparent',
      color: paletteColor.main,
      border: `1px solid ${paletteColor.main}`,
    };
  };

  const colors = getColors();

  return (
    <Chip
      {...props}
      sx={{
        fontWeight: 700,
        fontSize: '0.7rem',
        borderRadius: 1.5,
        ...colors,
        ...sx,
      }}
    />
  );
}
