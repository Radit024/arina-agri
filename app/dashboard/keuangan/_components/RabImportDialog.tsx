'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import type { UseRabControllerResult } from '@/controllers/keuangan/useRabController';
import type { FinanceScenarioEntity } from '@/lib/finance/rabTypes';

interface Props {
  rab: UseRabControllerResult;
  scenarios: FinanceScenarioEntity[];
  activeScenarioId: string | null;
}

export default function RabImportDialog({ rab, scenarios, activeScenarioId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [targetScenarioId, setTargetScenarioId] = useState<string>(activeScenarioId ?? '');

  useEffect(() => {
    if (activeScenarioId && rab.importDialogOpen) {
      setTargetScenarioId(activeScenarioId);
    }
  }, [activeScenarioId, rab.importDialogOpen]);

  const handleClose = () => {
    if (rab.importLoading) return;
    setSelectedFile(null);
    setIsDragActive(false);
    rab.setImportError(null);
    rab.setImportWarnings([]);
    rab.setImportDialogOpen(false);
  };

  const applyFile = (file: File | null) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      rab.setImportError('Format file tidak didukung. Unggah file Excel (.xlsx).');
      return;
    }
    setSelectedFile(file);
    rab.setImportError(null);
  };

  const handleImport = async () => {
    if (!selectedFile || !targetScenarioId) {
      rab.setImportError('File dan skenario tujuan harus diisi');
      return;
    }
    try {
      await rab.importRabFile(selectedFile, targetScenarioId);
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

        {rab.importWarnings.length > 0 && (
          <Alert severity="warning" onClose={() => rab.setImportWarnings([])} sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Import berhasil, namun ada beberapa catatan yang bisa Anda cek:
            </Typography>
            {rab.importWarnings.map((warning) => (
              <Typography key={warning} variant="caption" component="div">
                • {warning}
              </Typography>
            ))}
          </Alert>
        )}

        {rab.importWarnings.length === 0 && (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="target-scenario-label">Target Mode Skenario</InputLabel>
              <Select
                labelId="target-scenario-label"
                label="Target Mode Skenario"
                value={targetScenarioId}
                onChange={(e) => setTargetScenarioId(e.target.value)}
              >
                <MenuItem value="" disabled>Pilih Mode Skenario</MenuItem>
                {scenarios.map((scenario) => (
                  <MenuItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(event) => {
                applyFile(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />

            <Box
              onClick={() => !rab.importLoading && fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                if (!rab.importLoading) setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragActive(false);
                if (!rab.importLoading) applyFile(event.dataTransfer.files?.[0] ?? null);
              }}
              sx={{
                position: 'relative',
                border: '1px dashed',
                borderColor: isDragActive ? 'success.main' : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: rab.importLoading ? 'default' : 'pointer',
                bgcolor: isDragActive ? 'action.selected' : 'action.hover',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  opacity: rab.importLoading ? 0 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                <UploadFileIcon sx={{ fontSize: 32, color: isDragActive ? 'success.main' : 'text.secondary', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {selectedFile ? selectedFile.name : isDragActive ? 'Lepas file di sini' : 'Klik atau seret file .xlsx ke sini'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Item RAB baru akan ditambahkan ke item RAB yang sudah ada, bukan menggantikannya.
                </Typography>
              </Box>

              {rab.importLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    bgcolor: 'inherit',
                  }}
                >
                  <CircularProgress size={32} thickness={4} sx={{ color: 'success.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Mengimpor {selectedFile?.name}...
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Menyimpan item RAB dan transaksi, mohon tunggu.
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 3 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleClose}
            disabled={rab.importLoading}
            sx={{ borderRadius: 8, textTransform: 'none' }}
          >
            {rab.importWarnings.length > 0 ? 'Tutup' : 'Batal'}
          </Button>
          {rab.importWarnings.length === 0 && (
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
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
