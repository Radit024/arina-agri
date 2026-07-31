'use client';

import { useState } from 'react';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatMonthYear, formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeProject' | 'rab'>;

const ROW_DELETE_TRANSITION_MS = 220;

export default function RabPlanningView({ financeProject, rab }: Props) {
  const [selectedRabItemId, setSelectedRabItemId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  // Fades rows out first so the underlying multi-step delete (one request per item)
  // finishes while they're already invisible, instead of visibly flickering row by row.
  const animateThenDelete = async (ids: string[], action: () => Promise<void>) => {
    setPendingDeleteIds((prev) => new Set([...prev, ...ids]));
    await new Promise((resolve) => setTimeout(resolve, ROW_DELETE_TRANSITION_MS));
    try {
      await action();
    } finally {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  if (!financeProject.selectedProject) {
    return (
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Belum ada proyek</Typography>
          <Typography variant="body2" color="text.secondary">
            Buat proyek untuk mulai menyusun rencana anggaran biaya.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const allVisibleSelected =
    rab.filteredRabItems.length > 0 &&
    rab.filteredRabItems.every((item) => rab.selectedRabItemIds.includes(item.id));
  const someSelected = rab.selectedRabItemIds.length > 0 && !allVisibleSelected;

  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Pendapatan Rencana</Typography>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 800 }}>
              {formatRupiah(rab.totals.plannedIncome)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Biaya Rencana</Typography>
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 800 }}>
              {formatRupiah(rab.totals.plannedExpense)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Laba Rencana</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: rab.totals.plannedProfit >= 0 ? 'success.main' : 'error.main' }}>
              {formatRupiah(Math.abs(rab.totals.plannedProfit))}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <CardContent sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>RAB Proyek</Typography>
              <Typography variant="body2" color="text.secondary">
                Kelola item rencana biaya dan pendapatan per proyek tanam.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleIcon />}
              onClick={rab.openRabItemDialog}
              sx={{
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 800,
                boxShadow: 'none',
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' },
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark', boxShadow: 'none' },
              }}
            >
              Tambah Item RAB
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Jenis</InputLabel>
              <Select
                value={rab.rabFilterJenis}
                label="Jenis"
                onChange={(event) => rab.setRabFilterJenis(event.target.value as typeof rab.rabFilterJenis)}
              >
                <MenuItem value="semua">Semua Jenis</MenuItem>
                <MenuItem value="expense">Pengeluaran</MenuItem>
                <MenuItem value="income">Pendapatan</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="Cari item atau kategori..."
              value={rab.rabSearchQuery}
              onChange={(event) => rab.setRabSearchQuery(event.target.value)}
              sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {rab.selectedRabItemIds.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  ml: { sm: 'auto' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {rab.selectedRabItemIds.length} item dipilih
                </Typography>
                <Button size="small" variant="text" onClick={rab.clearRabItemSelection} sx={{ textTransform: 'none' }}>
                  Batalkan
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => rab.setRabBulkDeleteConfirm(true)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Hapus {rab.selectedRabItemIds.length}
                </Button>
              </Box>
            )}
          </Box>

          {rab.rabItemDeleteError && (
            <Alert severity="error" onClose={() => rab.setRabItemDeleteError(null)} sx={{ mb: 1.5, borderRadius: 2 }}>
              {rab.rabItemDeleteError}
            </Alert>
          )}

          <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected}
                      indeterminate={someSelected}
                      disabled={rab.filteredRabItems.length === 0}
                      onChange={() => {
                        if (allVisibleSelected) {
                          rab.clearRabItemSelection();
                        } else {
                          rab.filteredRabItems.forEach((item) => {
                            if (!rab.selectedRabItemIds.includes(item.id)) rab.toggleSelectRabItem(item.id);
                          });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Jenis</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell>Satuan</TableCell>
                  <TableCell align="right">Harga Satuan</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Bulan Kas</TableCell>
                  <TableCell align="right">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rab.filteredRabItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      {rab.items.length === 0 ? 'Belum ada item RAB.' : 'Tidak ada item RAB yang cocok dengan filter.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  rab.filteredRabItems.map((item) => {
                    const isSelected = rab.selectedRabItemIds.includes(item.id);
                    const isPendingDelete = pendingDeleteIds.has(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        selected={isSelected}
                        hover
                        onClick={() => rab.toggleSelectRabItem(item.id)}
                        sx={{
                          cursor: 'pointer',
                          transition: `opacity ${ROW_DELETE_TRANSITION_MS}ms ease, transform ${ROW_DELETE_TRANSITION_MS}ms ease`,
                          opacity: isPendingDelete ? 0 : 1,
                          transform: isPendingDelete ? 'translateX(12px)' : 'none',
                        }}
                      >
                        <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                          <Checkbox size="small" checked={isSelected} onChange={() => rab.toggleSelectRabItem(item.id)} />
                        </TableCell>
                        <TableCell>{item.categoryName ?? item.categoryId}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</TableCell>
                        <TableCell align="right">{item.volume}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{formatRupiah(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatRupiah(item.plannedTotal)}</TableCell>
                        <TableCell>{item.plannedCashMonth ? formatMonthYear(item.plannedCashMonth) : '-'}</TableCell>
                        <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                          {isSelected && (
                            <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                aria-label={`Edit item RAB ${item.name}`}
                                onClick={() => rab.openRabItemEditDialog(item)}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Hapus item RAB ${item.name}`}
                                onClick={() => setSelectedRabItemId(item.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedRabItemId)} onClose={() => setSelectedRabItemId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Hapus item RAB?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Item RAB ini akan dihapus permanen dan tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedRabItemId(null)} sx={{ textTransform: 'none' }}>Batal</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={async () => {
              const id = selectedRabItemId;
              setSelectedRabItemId(null);
              if (id) await animateThenDelete([id], () => rab.deleteRabItem(id));
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rab.rabBulkDeleteConfirm} onClose={() => rab.setRabBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Hapus {rab.selectedRabItemIds.length} item RAB?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Item RAB yang dipilih akan dihapus permanen dan tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => rab.setRabBulkDeleteConfirm(false)} sx={{ textTransform: 'none' }}>Batal</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={async () => {
              const ids = rab.selectedRabItemIds;
              rab.setRabBulkDeleteConfirm(false);
              await animateThenDelete(ids, rab.handleBulkDeleteRabItems);
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
