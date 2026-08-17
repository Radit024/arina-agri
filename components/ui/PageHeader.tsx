import * as React from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface PageHeaderProps extends Omit<BoxProps, 'title'> {
  /**
   * The main title of the page.
   */
  title: React.ReactNode;
  /**
   * Optional subtitle or greeting above the title.
   */
  subtitle?: React.ReactNode;
  /**
   * Optional actions to render on the right side.
   */
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  sx,
  ...props
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 5,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        gap: 2,
        ...sx,
      }}
      {...props}
    >
      <Box>
        {subtitle && (
          <Typography
            variant="subtitle2"
            sx={{
              color: 'success.main',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            {subtitle}
          </Typography>
        )}
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontFamily: 'var(--font-sora)',
            color: 'text.primary',
            fontWeight: 800,
            letterSpacing: 0,
            mb: subtitle ? 1 : 0,
          }}
        >
          {title}
        </Typography>
      </Box>
      {actions && (
        <Box sx={{ textAlign: { xs: 'left', md: 'right' }, width: { xs: '100%', md: 'auto' } }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}

export default PageHeader;
