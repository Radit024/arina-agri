'use client';

import AppDialog, { type AppDialogProps } from './AppDialog';

export interface ModalProps extends Omit<AppDialogProps, 'mobilePresentation' | 'onClose'> {
  /**
   * If true, the modal is full screen on mobile devices.
   * Default is true.
   */
  fullScreenOnMobile?: boolean;
  /**
   * Callback fired when the component requests to be closed.
   */
  onClose: () => void;
}

export default function Modal({
  fullScreenOnMobile = true,
  fullScreen,
  onClose,
  ...props
}: ModalProps) {
  return (
    <AppDialog
      {...props}
      fullScreen={fullScreen}
      mobilePresentation={fullScreen === undefined
        ? (fullScreenOnMobile ? 'fullscreen' : 'dialog')
        : (fullScreen ? 'fullscreen' : 'dialog')}
      onClose={() => onClose()}
    />
  );
}
