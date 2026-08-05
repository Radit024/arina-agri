'use client';

import React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export interface UnclassifiedTransactionsBannerProps {
  unclassifiedCount: number;
  onOpenDialog: () => void;
}

export default function UnclassifiedTransactionsBanner({
  unclassifiedCount,
  onOpenDialog,
}: UnclassifiedTransactionsBannerProps) {
  if (unclassifiedCount <= 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Alert
        severity="warning"
        icon={<WarningAmberRoundedIcon />}
        action={
          <Button
            color="inherit"
            size="small"
            variant="outlined"
            onClick={onOpenDialog}
            sx={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textTransform: 'none',
              borderColor: 'warning.dark',
            }}
          >
            Klasifikasikan Sekarang
          </Button>
        }
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'warning.light',
          alignItems: 'center',
        }}
      >
        <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>
          {unclassifiedCount} Transaksi Belum Diklasifikasi
        </AlertTitle>
        <Typography variant="body2" color="text.secondary">
          Transaksi lama ini perlu dikelompokkan ke Proyeksi atau Realisasi agar tampil pada Laba Rugi dan Arus Kas skenario.
        </Typography>
      </Alert>
    </Box>
  );
}
