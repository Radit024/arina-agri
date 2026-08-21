'use client';

import * as React from 'react';
import Box, { type BoxProps } from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SettingsIcon from '@mui/icons-material/Settings';

export interface FieldWithManageActionProps extends BoxProps {
  children: React.ReactNode;
  onManage: () => void;
  manageLabel?: string;
  manageIcon?: React.ReactNode;
  disabled?: boolean;
  dataTouchTarget?: string;
}

export function FieldWithManageAction({
  children,
  onManage,
  manageLabel = 'Kelola Master Data',
  manageIcon = <SettingsIcon fontSize="small" />,
  disabled = false,
  dataTouchTarget = '44',
  sx,
  ...props
}: FieldWithManageActionProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        width: '100%',
        ...sx,
      }}
      {...props}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <Tooltip title={manageLabel}>
        <span>
          <IconButton
            aria-label={manageLabel}
            data-touch-target={dataTouchTarget}
            onClick={onManage}
            disabled={disabled}
            size="small"
            sx={(theme) => ({
              minWidth: 40,
              minHeight: 40,
              mt: 0.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(22, 101, 52, 0.08)',
              },
            })}
          >
            {manageIcon}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

export default FieldWithManageAction;
