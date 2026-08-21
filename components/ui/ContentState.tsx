import * as React from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import EmptyState from './EmptyState';

export type ContentStateStatus = 'ready' | 'loading' | 'empty' | 'error';

export interface ContentStateProps {
  state: ContentStateStatus;
  children?: React.ReactNode;
  loadingLabel?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  errorTitle?: string;
  errorMessage?: string;
  errorIcon?: React.ReactNode;
  retry?: React.ReactNode;
}

export default function ContentState({
  state,
  children,
  loadingLabel = 'Memuat data...',
  emptyTitle = 'Belum ada data',
  emptyMessage = 'Tidak ada data untuk ditampilkan.',
  emptyIcon,
  emptyAction,
  errorTitle = 'Terjadi kesalahan',
  errorMessage = 'Data tidak dapat dimuat. Silakan coba lagi.',
  errorIcon,
  retry,
}: ContentStateProps) {
  if (state === 'ready') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'center', px: 2, py: 6 }}
      >
        <CircularProgress aria-hidden="true" size={32} />
        <Typography color="text.secondary" variant="body2">
          {loadingLabel}
        </Typography>
      </Box>
    );
  }

  if (state === 'empty') {
    return (
      <EmptyState
        action={emptyAction}
        aria-live="polite"
        icon={emptyIcon}
        message={emptyMessage}
        role="status"
        title={emptyTitle}
      />
    );
  }

  return (
    <EmptyState
      action={retry}
      icon={errorIcon ?? <ErrorOutlineIcon />}
      message={errorMessage}
      role="alert"
      title={errorTitle}
    />
  );
}
