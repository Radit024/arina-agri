'use client';

import * as React from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';

export type AppFieldType = 'text' | 'number' | 'currency' | 'date' | 'select';

export interface AppFieldOption {
  label: string;
  value: string | number;
}

export interface AppFieldProps extends Omit<TextFieldProps, 'type' | 'onChange' | 'value'> {
  type?: AppFieldType;
  value?: string | number | null;
  onChange?: (value: string, event?: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  options?: AppFieldOption[];
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
  dataTestId?: string;
  dataTouchTarget?: string;
}

export function AppField({
  type = 'text',
  value,
  onChange,
  options = [],
  startIcon,
  endIcon,
  min,
  max,
  step,
  dataTestId,
  dataTouchTarget = '44',
  error,
  helperText,
  size = 'small',
  fullWidth = true,
  slotProps,
  ...props
}: AppFieldProps) {
  const isCurrency = type === 'currency';
  const isNumber = type === 'number';
  const isSelect = type === 'select';
  const isDate = type === 'date';

  const formatDisplayValue = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    return String(val);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!onChange) return;
    const rawValue = event.target.value;

    if (isCurrency) {
      // Strip currency prefixes, spaces, and thousand-separator dots
      const cleanValue = rawValue.replace(/[^\d-]/g, '');
      onChange(cleanValue, event);
      return;
    }

    if (isNumber) {
      const cleanValue = rawValue.replace(/[^\d.-]/g, '');
      onChange(cleanValue, event);
      return;
    }

    onChange(rawValue, event);
  };

  const startAdornment = isCurrency ? (
    <InputAdornment position="start">Rp</InputAdornment>
  ) : startIcon ? (
    <InputAdornment position="start">{startIcon}</InputAdornment>
  ) : null;

  const endAdornment = endIcon ? (
    <InputAdornment position="end">{endIcon}</InputAdornment>
  ) : null;

  return (
    <TextField
      {...props}
      select={isSelect}
      type={isNumber ? 'number' : isDate ? 'date' : 'text'}
      value={formatDisplayValue(value)}
      onChange={handleChange}
      error={Boolean(error)}
      helperText={helperText}
      size={size}
      fullWidth={fullWidth}
      data-testid={dataTestId}
      data-touch-target={dataTouchTarget}
      slotProps={{
        ...slotProps,
        htmlInput: {
          ...slotProps?.htmlInput,
          ...(min !== undefined && { min }),
          ...(max !== undefined && { max }),
          ...(step !== undefined && { step }),
        },
        input: {
          ...slotProps?.input,
          ...(startAdornment && { startAdornment }),
          ...(endAdornment && { endAdornment }),
        },
      }}
    >
      {isSelect &&
        options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
    </TextField>
  );
}

export default AppField;
