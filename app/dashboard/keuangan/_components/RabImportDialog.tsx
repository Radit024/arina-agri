'use client';

import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import AppDialog from '@/components/ui/AppDialog';
import { formatRupiah } from '@/lib/formatters';
import type { UseRabControllerResult } from '@/controllers/keuangan/useRabController';
import type { FinanceScenarioEntity } from '@/lib/finance/rabTypes';

interface Props {
  rab: UseRabControllerResult;
  scenarios: FinanceScenarioEntity[];
  activeScenarioId: string | null;
  onNavigateTab?: (tab: 'buku-besar' | 'rab' | 'laba-rugi' | 'arus-kas' | 'arus-kas-pasca-pembiayaan' | 'perbandingan') => void;
}

export default function RabImportDialog({ rab, scenarios, activeScenarioId, onNavigateTab }: Props) {
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
    rab.resetImportState();
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

  const handleStartImport = async () => {
    if (!selectedFile || !targetScenarioId) {
      rab.setImportError('File dan skenario tujuan harus diisi');
      return;
    }
    try {
      await rab.importRabFile(selectedFile, targetScenarioId);
    } catch {
      // Error is handled in controller
    }
  };

  const handleConfirmPreflight = async () => {
    try {
      await rab.confirmPreflightAndImport(targetScenarioId);
    } catch {
      // Error is handled in controller
    }
  };

  const isPreflightMode = Boolean(rab.preflightData && !rab.importSummary);
  const isSummaryMode = Boolean(rab.importSummary);

  const selectedScenarioObj = scenarios.find((s) => s.id === targetScenarioId);
  const targetScenarioLabel = selectedScenarioObj
    ? selectedScenarioObj.mode === 'PROJECTION'
      ? 'Rencana (Proyeksi)'
      : 'Aktual (Realisasi)'
    : 'Mode Skenario';

  return (
    <AppDialog
      open={rab.importDialogOpen}
      onClose={handleClose}
      title={
        isSummaryMode
          ? 'Hasil Impor Excel'
          : isPreflightMode
          ? 'Pratinjau & Rekonsiliasi Impor'
          : 'Import RAB dari Excel'
      }
      subtitle={
        isSummaryMode
          ? `Data berhasil disimpan ke skenario ${targetScenarioLabel}`
          : isPreflightMode
          ? 'Periksa kesesuaian angka Excel sebelum data dimasukkan ke sistem'
          : 'Unggah file Excel RAB untuk mengisi kategori, item RAB, dan transaksi'
      }
      maxWidth="md"
      fullWidth
      actions={
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, width: '100%', flexWrap: 'wrap' }}>
          {isSummaryMode ? (
            <>
              {onNavigateTab && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<MenuBookIcon />}
                    onClick={() => {
                      handleClose();
                      onNavigateTab('rab');
                    }}
                    sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Tinjau RAB
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ReceiptLongIcon />}
                    onClick={() => {
                      handleClose();
                      onNavigateTab('buku-besar');
                    }}
                    sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Tinjau Transaksi
                  </Button>
                </>
              )}
              <Button
                variant="contained"
                onClick={handleClose}
                sx={{
                  minHeight: 44,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 800,
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                Selesai
              </Button>
            </>
          ) : isPreflightMode ? (
            <>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleClose}
                disabled={rab.importLoading}
                sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none' }}
              >
                Batal
              </Button>
              <Button
                variant="contained"
                startIcon={rab.importLoading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                disabled={rab.importLoading}
                onClick={handleConfirmPreflight}
                sx={{
                  minHeight: 44,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 800,
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                {rab.importLoading ? 'Menyimpan Data...' : 'Konfirmasi & Simpan ke Sistem'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleClose}
                disabled={rab.importLoading}
                sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none' }}
              >
                Batal
              </Button>
              <Button
                variant="contained"
                startIcon={rab.importLoading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                disabled={!selectedFile || rab.importLoading}
                onClick={handleStartImport}
                sx={{
                  minHeight: 44,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 800,
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                {rab.importLoading ? 'Membaca File...' : 'Lanjutkan Impor'}
              </Button>
            </>
          )}
        </Box>
      }
    >
      <Box sx={{ py: 1 }}>
        {rab.importError && (
          <Alert severity="error" onClose={() => rab.setImportError(null)} sx={{ mb: 2.5, borderRadius: 2 }}>
            {rab.importError}
          </Alert>
        )}

        {/* TAHAP 1: INPUT FORM */}
        {!isPreflightMode && !isSummaryMode && (
          <Stack spacing={3}>
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
                    {scenario.mode === 'PROJECTION' ? 'Rencana (Proyeksi)' : 'Aktual (Realisasi)'}
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
                border: '1.5px dashed',
                borderColor: isDragActive ? 'success.main' : 'divider',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                cursor: rab.importLoading ? 'default' : 'pointer',
                bgcolor: isDragActive ? 'action.selected' : 'action.hover',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ opacity: rab.importLoading ? 0 : 1, transition: 'opacity 0.15s ease' }}>
                <UploadFileIcon sx={{ fontSize: 44, color: isDragActive ? 'success.main' : 'text.secondary', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedFile ? selectedFile.name : isDragActive ? 'Lepas file di sini' : 'Klik atau seret file .xlsx ke sini'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Item RAB dan transaksi harian akan dibaca otomatis dan disimpan ke target {targetScenarioLabel}.
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
                    bgcolor: 'background.paper',
                  }}
                >
                  <CircularProgress size={36} thickness={4} sx={{ color: 'success.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Membaca {selectedFile?.name}...
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        )}

        {/* TAHAP 2: PREFLIGHT REVIEW */}
        {isPreflightMode && rab.preflightData && (
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                File <strong>{selectedFile?.name}</strong> berhasil dianalisis. Ditemukan{' '}
                <strong>{rab.preflightData.items.length} item RAB</strong> dan{' '}
                <strong>{rab.preflightData.transactions.length} transaksi</strong>.
              </Typography>
            </Alert>

            {/* Reconciliation table if discrepancy */}
            {rab.preflightData.reconciliation.length > 0 && (
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon color="warning" fontSize="small" />
                    Pemeriksaan Total per Kelompok Biaya
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Kelompok</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Total di Excel</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Hasil Hitung (Vol × Harga)</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Selisih</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rab.preflightData.reconciliation.map((rec, idx) => (
                          <TableRow key={rec.categoryId || rec.categoryName || idx}>
                            <TableCell sx={{ fontWeight: 600 }}>{rec.categoryName}</TableCell>
                            <TableCell align="right">{formatRupiah(rec.declaredTotal)}</TableCell>
                            <TableCell align="right">{formatRupiah(rec.computedTotal)}</TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 700,
                                color: Math.abs(rec.difference) > 1000 ? 'warning.main' : 'text.secondary',
                              }}
                            >
                              {formatRupiah(rec.difference)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Warnings list */}
            {rab.importWarnings.length > 0 && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Catatan untuk diperhatikan:
                </Typography>
                {rab.importWarnings.map((warning, index) => (
                  <Typography key={index} variant="caption" component="div" sx={{ mt: 0.25 }}>
                    • {warning}
                  </Typography>
                ))}
              </Alert>
            )}
          </Stack>
        )}

        {/* TAHAP 3: STRUCTURED RESULTS */}
        {isSummaryMode && rab.importSummary && (
          <Stack spacing={2.5}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'success.50',
                border: '1px solid',
                borderColor: 'success.200',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.dark' }}>
                  Impor Berhasil Disimpan
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data dari &quot;{rab.importSummary.projectName}&quot; telah selesai dimasukkan ke {targetScenarioLabel}.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Item RAB Dibuat
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                  {rab.importSummary.importedItemsCount}
                </Typography>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Transaksi Dicatat
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
                  {rab.importSummary.importedTransactionCount}
                </Typography>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Baris Dilewati
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary', mt: 0.5 }}>
                  {rab.importSummary.skippedCount}
                </Typography>
              </Card>
            </Box>

            {rab.importSummary.warnings.length > 0 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Catatan hasil impor:
                </Typography>
                {rab.importSummary.warnings.map((warning, index) => (
                  <Typography key={index} variant="caption" component="div" sx={{ mt: 0.25 }}>
                    • {warning}
                  </Typography>
                ))}
              </Alert>
            )}
          </Stack>
        )}
      </Box>
    </AppDialog>
  );
}
