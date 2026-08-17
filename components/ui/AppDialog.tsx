'use client';

import * as React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Dialog, { type DialogOwnerState, type DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, type Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/system';

export type AppDialogMobilePresentation = 'fullscreen' | 'bottom-sheet' | 'dialog';
export type AppDialogCloseReason = 'backdropClick' | 'escapeKeyDown' | 'closeButton';

export interface AppDialogProps extends Omit<DialogProps, 'children' | 'onClose' | 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leadingVisual?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: (event: React.SyntheticEvent, reason: AppDialogCloseReason) => void;
  mobilePresentation?: AppDialogMobilePresentation;
}

type DialogSlotProps = NonNullable<DialogProps['slotProps']>;
type PaperSlotProps = DialogSlotProps['paper'];
type ContainerSlotProps = DialogSlotProps['container'];

type SxArray = Extract<SxProps<Theme>, ReadonlyArray<unknown>>;

function isSxArray(sx: SxProps<Theme>): sx is SxArray {
  return Array.isArray(sx);
}

function mergeSx(baseSx: SxProps<Theme>, overrideSx: SxProps<Theme> | undefined): SxProps<Theme> {
  if (overrideSx === undefined) {
    return baseSx;
  }

  if (isSxArray(baseSx)) {
    return isSxArray(overrideSx) ? [...baseSx, ...overrideSx] : [...baseSx, overrideSx];
  }

  return isSxArray(overrideSx) ? [baseSx, ...overrideSx] : [baseSx, overrideSx];
}

function createPaperSlotProps(
  callerSlotProps: PaperSlotProps,
  baseSx: SxProps<Theme>,
): NonNullable<PaperSlotProps> {
  return (ownerState: DialogOwnerState) => {
    const resolvedSlotProps = typeof callerSlotProps === 'function'
      ? callerSlotProps(ownerState)
      : callerSlotProps;

    return {
      ...resolvedSlotProps,
      sx: mergeSx(baseSx, resolvedSlotProps?.sx),
    };
  };
}

function createContainerSlotProps(
  callerSlotProps: ContainerSlotProps,
): NonNullable<ContainerSlotProps> {
  return (ownerState: DialogOwnerState) => {
    const resolvedSlotProps = typeof callerSlotProps === 'function'
      ? callerSlotProps(ownerState)
      : callerSlotProps;

    return {
      ...resolvedSlotProps,
      sx: mergeSx({ alignItems: 'flex-end' }, resolvedSlotProps?.sx),
    };
  };
}

export default function AppDialog({
  title,
  subtitle,
  leadingVisual,
  children,
  actions,
  onClose,
  mobilePresentation = 'fullscreen',
  fullScreen: requestedFullScreen,
  scroll = 'paper',
  slotProps,
  'aria-labelledby': ariaLabelledBy,
  ...dialogProps
}: AppDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = React.useId();
  const isBottomSheet = isMobile && mobilePresentation === 'bottom-sheet';
  const isFullScreen = isMobile
    ? mobilePresentation === 'fullscreen'
    : requestedFullScreen;
  const hasActions = actions !== undefined && actions !== null;
  const closeButtonLabel = typeof title === 'string' ? `Tutup dialog ${title}` : 'Tutup dialog';

  const paperSx: SxProps<Theme> = {
    borderRadius: isFullScreen ? 0 : 3,
    ...(isBottomSheet && {
      width: '100%',
      maxWidth: '100%',
      maxHeight: '85dvh',
      m: 0,
      borderRadius: '24px 24px 0 0',
    }),
  };

  const dialogSlotProps: DialogProps['slotProps'] = {
    ...slotProps,
    paper: createPaperSlotProps(slotProps?.paper, paperSx),
    ...(isBottomSheet && {
      container: createContainerSlotProps(slotProps?.container),
    }),
  };

  return (
    <Dialog
      {...dialogProps}
      aria-labelledby={ariaLabelledBy ?? titleId}
      fullScreen={isFullScreen}
      scroll={scroll}
      slotProps={dialogSlotProps}
      onClose={onClose}
    >
      <DialogTitle component="div" id={titleId} sx={{ m: 0, p: 2.5, pb: subtitle ? 1 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {leadingVisual && (
            <Box sx={{ display: 'flex', flexShrink: 0, pt: 0.25 }}>
              {leadingVisual}
            </Box>
          )}
          <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
            <Typography component="h2" variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton
            aria-label={closeButtonLabel}
            onClick={(event) => onClose(event, 'closeButton')}
            sx={{
              width: 44,
              height: 44,
              color: 'text.secondary',
              bgcolor: (currentTheme) => currentTheme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.04)',
              '&:hover': {
                bgcolor: (currentTheme) => currentTheme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.08)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers={hasActions}
        sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', p: 2.5 }}
      >
        {children}
      </DialogContent>

      {hasActions && (
        <DialogActions sx={{ flex: '0 0 auto', p: 2.5, pt: 2 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
