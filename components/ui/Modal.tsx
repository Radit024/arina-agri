import React from 'react';
import MuiDialog, { DialogProps as MuiDialogProps } from '@mui/material/Dialog';
import MuiDialogTitle from '@mui/material/DialogTitle';
import MuiDialogContent from '@mui/material/DialogContent';
import MuiDialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export interface ModalProps extends Omit<MuiDialogProps, 'title'> {
  /**
   * The main title of the modal.
   */
  title: React.ReactNode;
  /**
   * Optional subtitle or description below the title.
   */
  subtitle?: React.ReactNode;
  /**
   * Content inside the modal body.
   */
  children: React.ReactNode;
  /**
   * Actions to display at the bottom of the modal (e.g., buttons).
   */
  actions?: React.ReactNode;
  /**
   * Callback fired when the component requests to be closed.
   */
  onClose: () => void;
  /**
   * If true, modal will be full screen on mobile devices.
   * Default is true.
   */
  fullScreenOnMobile?: boolean;
}

export default function Modal({
  title,
  subtitle,
  children,
  actions,
  onClose,
  fullScreenOnMobile = true,
  ...props
}: ModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const isFullScreen = fullScreenOnMobile && isMobile;

  return (
    <MuiDialog
      fullScreen={isFullScreen}
      onClose={onClose}
      slotProps={{
        ...props.slotProps,
        paper: {
          ...props.slotProps?.paper,
          sx: [
            { borderRadius: isFullScreen ? 0 : 3 },
             
            ...(typeof props.slotProps?.paper === 'object' && props.slotProps.paper !== null && 'sx' in props.slotProps.paper
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? Array.isArray((props.slotProps.paper as any).sx) ? (props.slotProps.paper as any).sx : [(props.slotProps.paper as any).sx]
                : []),
          ],
        },
      }}
      {...props}
    >
      <MuiDialogTitle sx={{ m: 0, p: 2.5, pb: subtitle ? 1 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ pr: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'text.secondary',
              bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              '&:hover': {
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </MuiDialogTitle>
      
      <MuiDialogContent dividers={!!actions} sx={{ p: 2.5 }}>
        {children}
      </MuiDialogContent>
      
      {actions && (
        <MuiDialogActions sx={{ p: 2.5, pt: 2 }}>
          {actions}
        </MuiDialogActions>
      )}
    </MuiDialog>
  );
}
