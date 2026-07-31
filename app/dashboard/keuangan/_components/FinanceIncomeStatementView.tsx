'use client';

import { useState } from 'react';

import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeReports' | 'labaRugiActions'>;

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    belum_ada_realisasi: 'Belum ada realisasi',
    sesuai_rencana: 'Sesuai rencana',
    hemat: 'Hemat',
    over_budget: 'Over budget',
    di_atas_target: 'Di atas target',
    di_bawah_target: 'Di bawah target',
  };
  return labels[status] ?? status;
}

const ROW_DELETE_TRANSITION_MS = 220;

export default function FinanceIncomeStatementView({ financeReports, labaRugiActions }: Props) {
  const { summary } = financeReports.incomeStatementComparison;
  const { filteredRows } = labaRugiActions;
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

  const selectableRowIds = filteredRows.filter((row) => row.itemId).map((row) => row.itemId as string);
  const allVisibleSelected =
    selectableRowIds.length > 0 && selectableRowIds.every((id) => labaRugiActions.selectedItemIds.includes(id));
  const someSelected = labaRugiActions.selectedItemIds.length > 0 && !allVisibleSelected;

  return (
    <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <CardContent sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Laba Rugi Rencana vs Aktual</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rencana laba {formatRupiah(summary.plannedProfit)} dibanding aktual {formatRupiah(summary.actualProfit)}.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Jenis</InputLabel>
            <Select
              value={labaRugiActions.filterJenis}
              label="Jenis"
              onChange={(event) => labaRugiActions.setFilterJenis(event.target.value as typeof labaRugiActions.filterJenis)}
            >
              <MenuItem value="semua">Semua Jenis</MenuItem>
              <MenuItem value="expense">Pengeluaran</MenuItem>
              <MenuItem value="income">Pendapatan</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Cari item atau kategori..."
            value={labaRugiActions.searchQuery}
            onChange={(event) => labaRugiActions.setSearchQuery(event.target.value)}
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
          {labaRugiActions.selectedItemIds.length > 0 && (
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
                {labaRugiActions.selectedItemIds.length} item dipilih
              </Typography>
              <Button size="small" variant="text" onClick={labaRugiActions.clearSelection} sx={{ textTransform: 'none' }}>
                Batalkan
              </Button>
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={() => labaRugiActions.setBulkDeleteConfirm(true)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Hapus {labaRugiActions.selectedItemIds.length}
              </Button>
            </Box>
          )}
        </Box>

        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allVisibleSelected}
                    indeterminate={someSelected}
                    disabled={selectableRowIds.length === 0}
                    onChange={() => {
                      if (allVisibleSelected) {
                        labaRugiActions.clearSelection();
                      } else {
                        selectableRowIds.forEach((id) => {
                          if (!labaRugiActions.selectedItemIds.includes(id)) labaRugiActions.toggleSelect(id);
                        });
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Jenis</TableCell>
                <TableCell align="right">Rencana</TableCell>
                <TableCell align="right">Aktual</TableCell>
                <TableCell align="right">Selisih</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    {financeReports.incomeStatementComparison.rows.length === 0
                      ? 'Belum ada data laba rugi.'
                      : 'Tidak ada baris yang cocok dengan filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  const rowKey = `${row.categoryId}-${row.itemId ?? row.itemName}`;
                  const isSelected = Boolean(row.itemId) && labaRugiActions.selectedItemIds.includes(row.itemId as string);
                  const isPendingDelete = Boolean(row.itemId) && pendingDeleteIds.has(row.itemId as string);
                  return (
                    <TableRow
                      key={rowKey}
                      selected={isSelected}
                      hover={Boolean(row.itemId)}
                      onClick={() => row.itemId && labaRugiActions.toggleSelect(row.itemId)}
                      sx={{
                        cursor: row.itemId ? 'pointer' : 'default',
                        transition: `opacity ${ROW_DELETE_TRANSITION_MS}ms ease, transform ${ROW_DELETE_TRANSITION_MS}ms ease`,
                        opacity: isPendingDelete ? 0 : 1,
                        transform: isPendingDelete ? 'translateX(12px)' : 'none',
                      }}
                    >
                      <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          disabled={!row.itemId}
                          onChange={() => row.itemId && labaRugiActions.toggleSelect(row.itemId)}
                        />
                      </TableCell>
                      <TableCell>{row.categoryName}</TableCell>
                      <TableCell>{row.itemName}</TableCell>
                      <TableCell>{row.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</TableCell>
                      <TableCell align="right">{formatRupiah(row.planned)}</TableCell>
                      <TableCell align="right">{formatRupiah(row.actual)}</TableCell>
                      <TableCell align="right">{formatRupiah(row.variance)}</TableCell>
                      <TableCell><Chip size="small" label={statusLabel(row.status)} /></TableCell>
                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        {isSelected && row.itemId && (
                          <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              aria-label={`Edit item RAB ${row.itemName}`}
                              onClick={() => labaRugiActions.editRow(row)}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Hapus item RAB ${row.itemName}`}
                              onClick={() => labaRugiActions.setDeleteTargetRow(row)}
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

      <Dialog open={Boolean(labaRugiActions.deleteTargetRow)} onClose={() => labaRugiActions.setDeleteTargetRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Hapus item RAB?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Item RAB &quot;{labaRugiActions.deleteTargetRow?.itemName}&quot; akan dihapus permanen dan tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => labaRugiActions.setDeleteTargetRow(null)} sx={{ textTransform: 'none' }}>Batal</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={async () => {
              const id = labaRugiActions.deleteTargetRow?.itemId;
              labaRugiActions.setDeleteTargetRow(null);
              if (id) await animateThenDelete([id], () => labaRugiActions.confirmDeleteRow(id));
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={labaRugiActions.bulkDeleteConfirm} onClose={() => labaRugiActions.setBulkDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Hapus {labaRugiActions.selectedItemIds.length} item RAB?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Item RAB yang dipilih akan dihapus permanen dan tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => labaRugiActions.setBulkDeleteConfirm(false)} sx={{ textTransform: 'none' }}>Batal</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={async () => {
              const ids = labaRugiActions.selectedItemIds;
              labaRugiActions.setBulkDeleteConfirm(false);
              await animateThenDelete(ids, labaRugiActions.handleBulkDelete);
            }}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Hapus
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
