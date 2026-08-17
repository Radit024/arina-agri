import * as React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

export type FormInputProps<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
} & Omit<TextFieldProps, 'name' | 'error'>;

export function FormInput<T extends FieldValues>({
  name,
  control,
  error,
  startIcon,
  endIcon,
  ...props
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          {...props}
          error={!!error}
          helperText={error}
          slotProps={{
            ...props.slotProps,
            input: {
              ...props.slotProps?.input,
              ...(startIcon && {
                startAdornment: (
                  <InputAdornment position="start">
                    {startIcon}
                  </InputAdornment>
                ),
              }),
              ...(endIcon && {
                endAdornment: (
                  <InputAdornment position="end">
                    {endIcon}
                  </InputAdornment>
                ),
              }),
            },
          }}
        />
      )}
    />
  );
}

export default FormInput;
