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

import ContentState from '@/components/ui/ContentState';
import MetricCard from '@/components/ui/MetricCard';
import ResponsiveDataView from '@/components/ui/ResponsiveDataView';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import type { RabItem } from '@/lib/finance/rabTypes';
import { formatMonthYear, formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeProject' | 'rab'>;

const ROW_DELETE_TRANSITION_MS = 220;

interface RabMobileItemCardProps {
  item: RabItem;
  isPendingDelete: boolean;
  isSelected: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
}

function RabMobileItemCard({
  item,
  isPendingDelete,
  isSelected,
  onDelete,
  onEdit,
  onSelect,
}: RabMobileItemCardProps) {
  const typeLabel = item.type === 'income' ? 'Pendapatan' : 'Pengeluaran';

  return (
    <Card
      aria-label={`Item RAB ${item.name}`}
      component="article"
      variant="outlined"
      sx={{
        minWidth: 0,
        mb: 1.5,
        opacity: isPendingDelete ? 0 : 1,
        pointerEvents: isPendingDelete ? 'none' : 'auto',
        transform: isPendingDelete ? 'translateX(12px)' : 'none',
        transition: `opacity ${ROW_DELETE_TRANSITION_MS}ms ease, transform ${ROW_DELETE_TRANSITION_MS}ms ease`,
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 }, minWidth: 0, p: 2 }}>
        <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 1, minWidth: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography color={item.type === 'income' ? 'success.main' : 'error.main'} variant="caption">
              {typeLabel}
            </Typography>
            <Typography component="h3" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }} variant="subtitle1">
              {item.name}
            </Typography>
          </Box>
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{ alignItems: 'center', display: 'flex', flexShrink: 0, gap: 0.25 }}
          >
            <Checkbox
              checked={isSelected}
              onChange={onSelect}
              size="small"
              slotProps={{ input: { 'aria-label': `Pilih item RAB ${item.name}` } }}
              sx={{ minHeight: 44, minWidth: 44 }}
            />
            {isSelected && (
              <>
                <IconButton
                  aria-label={`Edit item RAB ${item.name}`}
                  onClick={onEdit}
                  size="small"
                  sx={{ minHeight: 44, minWidth: 44 }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Hapus item RAB ${item.name}`}
                  color="error"
                  onClick={onDelete}
                  size="small"
                  sx={{ minHeight: 44, minWidth: 44 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            minWidth: 0,
            mt: 1.5,
          }}
        >
          <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption">Kategori</Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
              {item.categoryName ?? item.categoryId}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption">Volume</Typography>
            <Typography variant="body2">{item.volume} {item.unit}</Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption">Harga satuan</Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">{formatRupiah(item.unitPrice)}</Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption">Total rencana</Typography>
            <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }} variant="body2">{formatRupiah(item.plannedTotal)}</Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="caption">Bulan kas</Typography>
            <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
              {item.plannedCashMonth ? formatMonthYear(item.plannedCashMonth) : '-'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

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
          <ContentState
            emptyMessage="Buat proyek untuk mulai menyusun rencana anggaran biaya."
            emptyTitle="Belum ada proyek"
            state="empty"
          />
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MetricCard
            intent="success"
            label="Pendapatan Rencana"
            loading={rab.loading}
            value={formatRupiah(rab.totals.plannedIncome)}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MetricCard
            intent="error"
            label="Biaya Rencana"
            loading={rab.loading}
            value={formatRupiah(rab.totals.plannedExpense)}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MetricCard
            intent={rab.totals.plannedProfit >= 0 ? 'success' : 'error'}
            label="Laba Rencana"
            loading={rab.loading}
            value={formatRupiah(Math.abs(rab.totals.plannedProfit))}
          />
        </Box>
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

          <ResponsiveDataView
            data={rab.filteredRabItems}
            desktop={(
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Table aria-label="Daftar item RAB" size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={allVisibleSelected}
                          indeterminate={someSelected}
                          onChange={() => {
                            if (allVisibleSelected) {
                              rab.clearRabItemSelection();
                            } else {
                              rab.filteredRabItems.forEach((item) => {
                                if (!rab.selectedRabItemIds.includes(item.id)) rab.toggleSelectRabItem(item.id);
                              });
                            }
                          }}
                          slotProps={{ input: { 'aria-label': 'Pilih semua item RAB' } }}
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
                    {rab.filteredRabItems.map((item) => {
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
                            opacity: isPendingDelete ? 0 : 1,
                            transform: isPendingDelete ? 'translateX(12px)' : 'none',
                            transition: `opacity ${ROW_DELETE_TRANSITION_MS}ms ease, transform ${ROW_DELETE_TRANSITION_MS}ms ease`,
                          }}
                        >
                          <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => rab.toggleSelectRabItem(item.id)}
                              size="small"
                              slotProps={{ input: { 'aria-label': `Pilih item RAB ${item.name}` } }}
                            />
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
                                  aria-label={`Edit item RAB ${item.name}`}
                                  onClick={() => rab.openRabItemEditDialog(item)}
                                  size="small"
                                  sx={{ minHeight: 44, minWidth: 44 }}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  aria-label={`Hapus item RAB ${item.name}`}
                                  color="error"
                                  onClick={() => setSelectedRabItemId(item.id)}
                                  size="small"
                                  sx={{ minHeight: 44, minWidth: 44 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            emptyMessage={rab.items.length === 0 ? 'Belum ada item RAB.' : 'Tidak ada item RAB yang cocok dengan filter.'}
            emptyTitle={rab.items.length === 0 ? 'Belum ada item RAB' : 'Tidak ada item yang cocok'}
            errorMessage={rab.error ?? undefined}
            errorTitle="RAB tidak dapat dimuat"
            getItemKey={(item) => item.id}
            loadingLabel="Memuat item RAB..."
            renderMobileItem={(item) => (
              <RabMobileItemCard
                isPendingDelete={pendingDeleteIds.has(item.id)}
                isSelected={rab.selectedRabItemIds.includes(item.id)}
                item={item}
                onDelete={() => setSelectedRabItemId(item.id)}
                onEdit={() => rab.openRabItemEditDialog(item)}
                onSelect={() => rab.toggleSelectRabItem(item.id)}
              />
            )}
            retry={<Button onClick={rab.reload} sx={{ textTransform: 'none' }}>Coba lagi</Button>}
            state={rab.error ? 'error' : rab.loading ? 'loading' : rab.filteredRabItems.length === 0 ? 'empty' : 'ready'}
          />
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
