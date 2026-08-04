'use client';

import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { ApiTransaction } from '@/lib/api';

export interface TransactionClassificationDialogProps {
  open: boolean;
  onClose: () => void;
  unclassifiedTransactions: ApiTransaction[];
  projectionScenarioId: string | null;
  realizationScenarioId: string | null;
  onClassify: (
    transactionIds: string[],
    targetScenarioId: string,
  ) => Promise<{ successCount: number; failCount: number }>;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export default function TransactionClassificationDialog({
  open,
  onClose,
  unclassifiedTransactions,
  projectionScenarioId,
  realizationScenarioId,
  onClassify,
  isSubmitting = false,
  submitError = null,
}: TransactionClassificationDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<'REALIZATION' | 'PROJECTION'>('REALIZATION');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const allSelected =
    unclassifiedTransactions.length > 0 &&
    selectedIds.length === unclassifiedTransactions.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unclassifiedTransactions.map((tx) => tx._id || ''));
    }
  };

  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleClassifySubmit = async () => {
    const targetScenarioId =
      targetMode === 'PROJECTION' ? projectionScenarioId : realizationScenarioId;

    if (!targetScenarioId) {
      return;
    }

    setResultMessage(null);
    const result = await onClassify(selectedIds, targetScenarioId);
    if (result.failCount > 0) {
      setResultMessage(
        `${result.successCount} transaksi diklasifikasikan, ${result.failCount} gagal.`,
      );
    } else if (result.successCount > 0) {
      setSelectedIds([]);
      if (unclassifiedTransactions.length - result.successCount <= 0) {
        onClose();
      }
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
      val,
    );

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Klasifikasi Transaksi Lama ({unclassifiedTransactions.length})
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Pilih transaksi lama yang belum memiliki skenario dan tentukan apakah transaksi tersebut termasuk ke
            dalam Proyeksi (Rencana) atau Realisasi (Aktual).
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              {submitError}
            </Alert>
          )}

          {resultMessage && (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              {resultMessage}
            </Alert>
          )}

          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
              Klasifikasikan ke Skenario:
            </FormLabel>
            <RadioGroup
              row
              value={targetMode}
              onChange={(e) => setTargetMode(e.target.value as 'REALIZATION' | 'PROJECTION')}
            >
              <FormControlLabel
                value="REALIZATION"
                control={<Radio size="small" />}
                label="Realisasi (Aktual)"
                disabled={!realizationScenarioId}
              />
              <FormControlLabel
                value="PROJECTION"
                control={<Radio size="small" />}
                label="Proyeksi (Rencana)"
                disabled={!projectionScenarioId}
              />
            </RadioGroup>
          </FormControl>

          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      disabled={unclassifiedTransactions.length === 0}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tanggal</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Jenis</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Kategori</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Nominal
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unclassifiedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Tidak ada transaksi yang belum diklasifikasikan.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  unclassifiedTransactions.map((tx) => {
                    const id = tx._id || '';
                    const isChecked = selectedIds.includes(id);
                    return (
                      <TableRow
                        key={id}
                        hover
                        onClick={() => handleToggleRow(id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={isChecked} />
                        </TableCell>
                        <TableCell>{tx.tanggal}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                              fontWeight: 600,
                            }}
                          >
                            {tx.jenis === 'pendapatan' ? 'Pendapatan' : 'Pengeluaran'}
                          </Typography>
                        </TableCell>
                        <TableCell>{tx.kategori}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatRupiah(tx.nominal)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Tutup
        </Button>
        <Button
          variant="contained"
          onClick={handleClassifySubmit}
          disabled={
            isSubmitting ||
            selectedIds.length === 0 ||
            (!projectionScenarioId && !realizationScenarioId)
          }
        >
          {isSubmitting
            ? 'Mengklasifikasikan...'
            : `Klasifikasikan (${selectedIds.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
