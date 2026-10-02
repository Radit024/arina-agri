import * as React from 'react';
import MuiCard, { CardProps as MuiCardProps } from '@mui/material/Card';
import MuiCardHeader, { CardHeaderProps as MuiCardHeaderProps } from '@mui/material/CardHeader';
import MuiCardContent, { CardContentProps as MuiCardContentProps } from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

/**
 * Token visual kartu (radius 32px, border `divider`, tanpa bayangan) dikunci
 * di `MuiCard.styleOverrides` pada `lib/theme.ts`. Wrapper ini hanya menambah
 * bagian header — judul, subjudul, aksi, dan konten — sehingga kartu MUI mentah dan
 * kartu ini tampil sama.
 */
export interface CardProps extends Omit<MuiCardProps, 'title'> {
  /**
   * Optional title for the card header.
   */
  title?: React.ReactNode;
  /**
   * Optional subheader for the card header.
   */
  subheader?: React.ReactNode;
  /**
   * Optional action element for the card header (e.g. a button).
   */
  action?: React.ReactNode;
  /**
   * Props to pass to the underlying CardHeader component.
   */
  headerProps?: Partial<MuiCardHeaderProps>;
  /**
   * Props to pass to the underlying CardContent component.
   */
  contentProps?: Partial<MuiCardContentProps>;
  /**
   * If true, removes the internal padding from CardContent.
   */
  noPadding?: boolean;
}

export function Card({
  title,
  subheader,
  action,
  children,
  headerProps,
  contentProps,
  noPadding,
  sx,
  ...props
}: CardProps) {
  const hasHeader = title || subheader || action;

  return (
    <MuiCard sx={sx} {...props}>
      {hasHeader && (
        <MuiCardHeader
          title={
            typeof title === 'string' ? (
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                {title}
              </Typography>
            ) : (
              title
            )
          }
          subheader={subheader}
          action={action}
          sx={{ pb: 0, ...headerProps?.sx }}
          {...headerProps}
        />
      )}
      {children && (
        <MuiCardContent
          sx={{
            ...(noPadding && { p: 0, '&:last-child': { pb: 0 } }),
            ...contentProps?.sx,
          }}
          {...contentProps}
        >
          {children}
        </MuiCardContent>
      )}
    </MuiCard>
  );
}

export default Card;
