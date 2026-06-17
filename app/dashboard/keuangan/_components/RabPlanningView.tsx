'use client';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { FormEvent } from 'react';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatRupiah } from '@/lib/formatters';

type Props = Pick<UseKeuanganControllerResult, 'financeProject' | 'rab'>;

export default function RabPlanningView({ financeProject, rab }: Props) {
  const submitRabItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const volume = Number(formData.get('volume') || 0);
    const unitPrice = Number(formData.get('unitPrice') || 0);
    void rab.addRabItem({
      categoryName: String(formData.get('categoryName') || 'Lain-lain'),
      type: String(formData.get('type') || 'expense') === 'income' ? 'income' : 'expense',
      name: String(formData.get('name') || 'Item RAB'),
      volume,
      unit: String(formData.get('unit') || 'Unit'),
      unitPrice,
      plannedCashMonth: String(formData.get('plannedCashMonth') || '') || undefined,
    });
    rab.setRabItemDialogOpen(false);
  };

  if (!financeProject.selectedProject) {
    return (
      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Belum ada proyek</Typography>
          <Typography variant="body2" color="text.secondary">
            Buat proyek atau import Excel untuk mulai menyusun rencana anggaran biaya.
          </Typography>
        </CardContent>
      </Card>
    );
  }

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

      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>RAB Proyek</Typography>
              <Typography variant="body2" color="text.secondary">
                Kelola item rencana biaya dan pendapatan per proyek tanam.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => rab.setRabItemDialogOpen(true)} sx={{ borderRadius: 8 }}>
              Tambah Item
            </Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Jenis</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell>Satuan</TableCell>
                  <TableCell align="right">Harga Satuan</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Bulan Kas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rab.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      Belum ada item RAB. Tambahkan manual atau import Excel.
                    </TableCell>
                  </TableRow>
                ) : (
                  rab.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.categoryName ?? item.categoryId}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</TableCell>
                      <TableCell align="right">{item.volume}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell align="right">{formatRupiah(item.unitPrice)}</TableCell>
                      <TableCell align="right">{formatRupiah(item.plannedTotal)}</TableCell>
                      <TableCell>{item.plannedCashMonth ?? '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={rab.rabItemDialogOpen} onClose={() => rab.setRabItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tambah Item RAB</DialogTitle>
        <Box component="form" onSubmit={submitRabItem}>
          <DialogContent sx={{ display: 'grid', gap: 2 }}>
            <TextField name="categoryName" label="Kategori" defaultValue="Saprodi" required />
            <TextField name="type" label="Jenis" select defaultValue="expense">
              <MenuItem value="expense">Pengeluaran</MenuItem>
              <MenuItem value="income">Pendapatan</MenuItem>
            </TextField>
            <TextField name="name" label="Nama Item" required />
            <TextField name="volume" label="Volume" type="number" defaultValue={1} required />
            <TextField name="unit" label="Satuan" defaultValue="Unit" required />
            <TextField name="unitPrice" label="Harga Satuan" type="number" defaultValue={0} required />
            <TextField name="plannedCashMonth" label="Bulan Kas" placeholder="2026-08" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => rab.setRabItemDialogOpen(false)}>Batal</Button>
            <Button type="submit" variant="contained">Simpan</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
