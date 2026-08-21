import React from 'react';
import Box, { BoxProps } from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SearchOffIcon from '@mui/icons-material/SearchOff';

export interface EmptyStateProps extends BoxProps {
  /**
   * The main message or description.
   */
  message: string;
  /**
   * Optional title above the message.
   */
  title?: string;
  /**
   * Optional icon to display. If not provided, a default SearchOffIcon is used.
   */
  icon?: React.ReactNode;
  /**
   * Optional action button or element below the message.
   */
  action?: React.ReactNode;
}

export default function EmptyState({
  message,
  title,
  icon,
  action,
  sx,
  ...props
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 6,
        px: 2,
        textAlign: 'center',
        ...sx,
      }}
      {...props}
    >
      <Box
        sx={{
          color: 'text.disabled',
          display: 'flex',
          '& > svg': {
            fontSize: 48,
          },
        }}
      >
        {icon || <SearchOffIcon />}
      </Box>
      <Box>
        {title && (
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Box>
      {action && (
        <Box sx={{ mt: 1 }}>
          {action}
        </Box>
      )}
    </Box>
  );
}
