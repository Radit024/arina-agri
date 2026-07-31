'use client';

import { useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

type Props = Pick<UseKeuanganControllerResult, 'rab'>;

export default function RabImportDialog({ rab }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleClose = () => {
    if (rab.importLoading) return;
    setSelectedFile(null);
    rab.setImportError(null);
    rab.setImportDialogOpen(false);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      await rab.importRabFile(selectedFile);
      setSelectedFile(null);
    } catch {
      // Pesan error sudah ditampilkan lewat rab.importError.
    }
  };

  return (
    <Dialog
      open={rab.importDialogOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="span" variant="h6" sx={{ display: 'block', fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}>
          Import RAB dari Excel
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Unggah file Excel RAB untuk mengisi kategori dan item RAB, sekaligus mencatat transaksi dari sheet Buku Besar (Catatan Transaksi Harian) proyek ini.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        {rab.importError && (
          <Alert severity="error" onClose={() => rab.setImportError(null)} sx={{ mb: 2, borderRadius: 2 }}>
            {rab.importError}
          </Alert>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file);
            rab.setImportError(null);
          }}
        />

        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: 'action.hover',
          }}
        >
          <UploadFileIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {selectedFile ? selectedFile.name : 'Klik untuk memilih file .xlsx'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Item RAB baru akan ditambahkan ke item RAB yang sudah ada, bukan menggantikannya.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 3 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleClose}
            disabled={rab.importLoading}
            sx={{ borderRadius: 8, textTransform: 'none' }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            startIcon={rab.importLoading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            disabled={!selectedFile || rab.importLoading}
            onClick={handleImport}
            sx={{
              borderRadius: 8,
              textTransform: 'none',
              fontWeight: 800,
              bgcolor: 'success.main',
              '&:hover': { bgcolor: 'success.dark' },
            }}
          >
            {rab.importLoading ? 'Mengimpor...' : 'Import'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
