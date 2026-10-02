import * as React from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

/**
 * Token visual tombol (radius, font, padding) dikunci di
 * `MuiButton.styleOverrides` pada `lib/theme.ts`. Wrapper ini hanya menambah
 * perilaku `loading`, sehingga tombol MUI mentah dan tombol ini tetap sama.
 */
export interface ButtonProps extends MuiButtonProps {
  /**
   * If `true`, the button will show a loading spinner and become disabled.
   */
  loading?: boolean;
  /**
   * Optional loading text to display next to the spinner.
   * If not provided, the spinner will replace the startIcon or just show up.
   */
  loadingText?: React.ReactNode;
}

export function Button({
  children,
  loading = false,
  loadingText,
  disabled,
  startIcon,
  sx,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const renderStartIcon = loading ? <CircularProgress size={18} color="inherit" /> : startIcon;
  const content = loading && loadingText ? loadingText : children;

  return (
    <MuiButton
      disabled={isDisabled}
      startIcon={renderStartIcon}
      sx={sx}
      {...props}
    >
      {content}
    </MuiButton>
  );
}

export default Button;
