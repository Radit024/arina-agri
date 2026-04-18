'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';

import DeleteIcon from '@mui/icons-material/Delete';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

import useLocalStorage from '@/hooks/useLocalStorage';
import { mockTransactions } from '@/lib/mockData';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { Transaction } from '@/lib/mockData';
import { PieChart } from '@mui/x-charts/PieChart';

const transactionSchema = z.object({
  jenis: z.enum(['pengeluaran', 'pendapatan'], { message: 'Pilih jenis transaksi' }),
  kategori: z.string().min(1, 'Pilih kategori'),
  nominal: z.string().min(1, 'Masukkan nominal').refine(
    (v) => !isNaN(Number(v.replace(/\./g, ''))) && Number(v.replace(/\./g, '')) > 0,
    'Nominal harus lebih dari 0'
  ),
  tanggal: z.string().min(1, 'Pilih tanggal'),
  keterangan: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const AI_ANALYSIS = `Berdasarkan pantauan arus kas Anda saat ini, laporan menunjukkan performa yang cukup baik. Terdapat kas positif yang masuk stabil.
Komponen biaya terbesar Anda didominasi oleh sarana pemeliharaan konvensional (Pupuk & Pestisida).

💡 Rekomendasi Arina AI:
• Pertahankan efisiensi biaya pupuk dengan menyelingi penggunaan pupuk organik kompos limbah (potensi hemat 10-15%).
• Pencatatan transaksi disarankan dilakukan maksimal setiap 3 hari sekali agar tidak ada nota yang hilang.
• Kas Anda terlihat positif bulan ini. Sangat disarankan menyisihkan 20% dari dana segar untuk dijadikan "Dana Darurat Lahan" guna modal perbaikan alat atau perubahan iklim ekstrem di depan.`;

export default function KeuanganPage() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('arina-transactions', mockTransactions);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pengeluaran' | 'pendapatan'>('semua');

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      jenis: 'pengeluaran',
      kategori: '',
      nominal: '',
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
    },
  });

  const selectedJenis = watch('jenis');

  const kategoriFiltered =
    selectedJenis === 'pendapatan'
      ? ['Penjualan Hasil Panen', 'Layanan Jasa', 'Lainnya']
      : ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi & Air', 'Alat Tani', 'Lainnya'];

  const openAddDialog = () => {
    setEditingId(null);
    reset({
      jenis: 'pengeluaran',
      kategori: '',
      nominal: '',
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
    });
    setTxDialogOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    reset({
      jenis: tx.jenis as 'pengeluaran' | 'pendapatan',
      kategori: tx.kategori,
      nominal: tx.nominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
      tanggal: tx.tanggal,
      keterangan: tx.keterangan,
    });
    setTxDialogOpen(true);
  };

  const onSubmit = (data: TransactionFormData) => {
    const txData: Transaction = {
      id: editingId ? editingId : Date.now().toString(),
      jenis: data.jenis,
      kategori: data.kategori,
      nominal: Number(data.nominal.replace(/\./g, '')),
      tanggal: data.tanggal,
      keterangan: data.keterangan || '',
    };

    if (editingId) {
      setTransactions((prev) => prev.map((t) => (t.id === editingId ? txData : t)));
    } else {
      setTransactions((prev) => [txData, ...prev]);
    }

    setTxDialogOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNominalChange = (value: string, onChange: (v: string) => void) => {
    const raw = value.replace(/\D/g, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    onChange(formatted);
  };

  const handleExportCSV = () => {
    const headers = 'Tanggal,Kategori,Keterangan,Jenis,Nominal';
    const csvStr = transactions
      .map((t) => `${t.tanggal},"${t.kategori}","${t.keterangan?.replace(/"/g, '""') || ''}",${t.jenis},${t.nominal}`)
      .join('\n');
    const blob = new Blob([headers + '\n' + csvStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Keuangan_Arina_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Summaries
  const totalPendapatan = transactions.filter((t) => t.jenis === 'pendapatan').reduce((a, t) => a + t.nominal, 0);
  const totalPengeluaran = transactions.filter((t) => t.jenis === 'pengeluaran').reduce((a, t) => a + t.nominal, 0);
  const labaBersih = totalPendapatan - totalPengeluaran;

  // Pie chart data
  const pieCategories = ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi & Air', 'Alat Tani', 'Lainnya'];
  const pieColors = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#64748b'];
  const expenseStats = pieCategories
    .map((k, i) => ({
      id: k,
      value: transactions.filter((t) => t.jenis === 'pengeluaran' && t.kategori === k).reduce((a, b) => a + b.nominal, 0),
      label: k,
      color: pieColors[i],
    }))
    .filter((item) => item.value > 0);

  const finalPieData = expenseStats.length > 0 ? expenseStats : [{ id: 'Kosong', value: 1, label: 'Belum Ada Data', color: '#e2e8f0' }];
  const finalPieColors = expenseStats.length > 0 ? expenseStats.map((e) => e.color) : ['#e2e8f0'];

  // Filtered table data
  const displayedTransactions = transactions.filter(
    (t) => filterJenis === 'semua' || t.jenis === filterJenis
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            Manajemen Keuangan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pantau arus kas, analisis biaya, dan telusuri profil pengeluaran kebun Anda.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          color="success"
          sx={{ borderRadius: 8, bgcolor: 'background.paper', boxShadow: 1, whiteSpace: 'nowrap' }}
        >
          Ekspor CSV
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* ─── KIRI: Buku Besar Transaksi (BESAR) ─── */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  Buku Besar Transaksi
                </Typography>
              }
              subheader={`${displayedTransactions.length} transaksi ditampilkan`}
              action={
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  {/* Filter */}
                  <FormControl size="small" sx={{ minWidth: 170 }}>
                    <InputLabel>Filter Tipe</InputLabel>
                    <Select
                      value={filterJenis}
                      label="Filter Tipe"
                      onChange={(e) => setFilterJenis(e.target.value as typeof filterJenis)}
                    >
                      <MenuItem value="semua">Semua</MenuItem>
                      <MenuItem value="pendapatan">Pemasukan</MenuItem>
                      <MenuItem value="pengeluaran">Pengeluaran</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Tombol Tambah Transaksi */}
                  <Button
                    id="btn-catat-transaksi"
                    variant="contained"
                    startIcon={<AddCircleIcon />}
                    onClick={openAddDialog}
                    sx={{ borderRadius: 8, whiteSpace: 'nowrap' }}
                  >
                    Catat Transaksi
                  </Button>
                </Box>
              }
              sx={{ pb: 1, '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' } }}
            />

            <CardContent sx={{ pt: 0, flex: 1, px: 2, pb: 2 }}>
              <TableContainer sx={{ maxHeight: { xs: 500, lg: 700 }, overflow: 'auto' }}>
                <Table size="medium" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Tanggal', 'Kategori', 'Detail / Catatan', 'Tipe', 'Nilai (Rp)', 'Opsi'].map((h) => (
                        <TableCell
                          key={h}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            color: 'text.secondary',
                            backgroundColor: 'background.paper',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary">
                              Belum ada transaksi untuk filter ini.
                            </Typography>
                            <Button size="small" variant="outlined" onClick={openAddDialog} sx={{ mt: 1, borderRadius: 8 }}>
                              Tambah pertama
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedTransactions.map((tx) => (
                        <TableRow key={tx.id} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.018)' } }}>
                          <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary', minWidth: 90 }}>
                            {formatDateShort(tx.tanggal)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', minWidth: 120 }}>
                            {tx.kategori}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary', maxWidth: 240 }}>
                            <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                              {tx.keterangan || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={tx.jenis === 'pendapatan' ? 'Pemasukan' : 'Pengeluaran'}
                              size="small"
                              sx={{
                                backgroundColor: tx.jenis === 'pendapatan' ? '#dcfce7' : '#fee2e2',
                                color: tx.jenis === 'pendapatan' ? '#16a34a' : '#dc2626',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                borderRadius: 1.5,
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                              minWidth: 120,
                            }}
                          >
                            {tx.jenis === 'pendapatan' ? '+' : '−'}{formatRupiah(tx.nominal)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                aria-label="Edit Transaksi"
                                onClick={() => handleEdit(tx)}
                                sx={{
                                  borderRadius: 2,
                                  color: 'primary.main',
                                  bgcolor: 'primary.light',
                                  '&:hover': { bgcolor: 'primary.main', color: 'white' },
                                }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label="Hapus Transaksi"
                                onClick={() => handleDelete(tx.id)}
                                sx={{
                                  borderRadius: 2,
                                  color: 'error.main',
                                  bgcolor: '#fee2e2',
                                  '&:hover': { bgcolor: 'error.main', color: 'white' },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── KANAN: Ringkasan & Grafik ─── */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Kartu Ringkasan */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  Ringkasan Bisnis
                </Typography>
              }
              action={
                <IconButton
                  onClick={() => setAiDialogOpen(true)}
                  sx={{
                    color: 'primary.dark',
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.main', color: 'white' },
                  }}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {/* Pemasukan */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: '#f0fdf4',
                  borderRadius: 3,
                  mb: 2,
                  border: '1px solid #bbf7d0',
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Total Pemasukan</Typography>
                  <Typography variant="h6" color="success.main" sx={{ lineHeight: 1.2, fontWeight: 800 }}>
                    {formatRupiah(totalPendapatan)}
                  </Typography>
                </Box>
              </Box>

              {/* Pengeluaran */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: '#fff1f2',
                  borderRadius: 3,
                  mb: 2,
                  border: '1px solid #fecdd3',
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDownIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Total Pengeluaran</Typography>
                  <Typography variant="h6" color="error.main" sx={{ lineHeight: 1.2, fontWeight: 800 }}>
                    {formatRupiah(totalPengeluaran)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Laba bersih */}
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: labaBersih >= 0 ? 'rgba(22, 163, 74, 0.07)' : 'rgba(220, 38, 38, 0.07)',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: labaBersih >= 0 ? '#bbf7d0' : '#fecaca',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {labaBersih >= 0 ? 'ESTIMASI LABA BERSIH' : 'DEFISIT ANGGARAN'}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: 'var(--font-sora)',
                    color: labaBersih >= 0 ? 'success.main' : 'error.main',
                    lineHeight: 1.1,
                    mt: 0.5,
                    fontWeight: 900,
                  }}
                >
                  {formatRupiah(Math.abs(labaBersih))}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Grafik Distribusi Pengeluaran */}
          <Card>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  Distribusi Pengeluaran
                </Typography>
              }
            />
            <CardContent sx={{ pt: 0, display: 'flex', justifyContent: 'center' }}>
              <PieChart
                series={[
                  {
                    data: finalPieData,
                    innerRadius: 48,
                    outerRadius: 88,
                    paddingAngle: expenseStats.length > 0 ? 4 : 0,
                    cornerRadius: 5,
                    highlightScope: { fade: 'global', highlight: 'item' },
                    faded: { innerRadius: 40, additionalRadius: -10, color: 'gray' },
                  },
                ]}
                colors={finalPieColors}
                width={300}
                height={200}
                slotProps={{
                  legend: {
                    direction: 'vertical',
                    position: { vertical: 'middle', horizontal: 'end' },
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── MODAL: Catat / Edit Transaksi ─── */}
      <Dialog
        open={txDialogOpen}
        onClose={() => { setTxDialogOpen(false); setEditingId(null); }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  bgcolor: editingId ? 'primary.light' : '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {editingId
                  ? <EditOutlinedIcon sx={{ color: 'primary.dark', fontSize: 20 }} />
                  : <AddCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', lineHeight: 1.2, fontWeight: 800 }}>
                  {editingId ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingId ? 'Perbarui data transaksi yang sudah ada' : 'Tambahkan pemasukan atau pengeluaran baru'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={() => { setTxDialogOpen(false); setEditingId(null); }}
              sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Jenis & Tanggal */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="jenis"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.jenis}>
                      <InputLabel>Jenis Transaksi</InputLabel>
                      <Select {...field} label="Jenis Transaksi">
                        <MenuItem value="pendapatan">Pemasukan (+)</MenuItem>
                        <MenuItem value="pengeluaran">Pengeluaran (−)</MenuItem>
                      </Select>
                      {errors.jenis && <FormHelperText>{errors.jenis.message}</FormHelperText>}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="tanggal"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="date"
                      label="Tanggal"
                      fullWidth
                      error={!!errors.tanggal}
                      helperText={errors.tanggal?.message}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* Kategori */}
            <Controller
              name="kategori"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.kategori}>
                  <InputLabel>Kategori</InputLabel>
                  <Select {...field} label="Kategori">
                    {kategoriFiltered.map((k) => (
                      <MenuItem key={k} value={k}>{k}</MenuItem>
                    ))}
                  </Select>
                  {errors.kategori && <FormHelperText>{errors.kategori.message}</FormHelperText>}
                </FormControl>
              )}
            />

            {/* Nominal */}
            <Controller
              name="nominal"
              control={control}
              render={({ field: { value, onChange, ...rest } }) => (
                <TextField
                  {...rest}
                  value={value}
                  onChange={(e) => handleNominalChange(e.target.value, onChange)}
                  label="Nominal"
                  placeholder="250.000"
                  error={!!errors.nominal}
                  helperText={errors.nominal?.message}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />

            {/* Keterangan */}
            <Controller
              name="keterangan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Catatan (opsional)"
                  multiline
                  rows={2}
                  fullWidth
                  placeholder={
                    selectedJenis === 'pengeluaran'
                      ? 'Cth: Beli 2 sak Phonska di toko pak tani'
                      : 'Cth: Laku 50kg tomat ke tengkulak pak Darwis'
                  }
                />
              )}
            />

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => { setTxDialogOpen(false); setEditingId(null); }}
                sx={{ flex: 1, borderRadius: 8 }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  flex: 2,
                  borderRadius: 8,
                  bgcolor: selectedJenis === 'pendapatan' ? 'success.main' : '#1e293b',
                }}
              >
                {editingId ? 'Perbarui Data' : 'Simpan Transaksi'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Analisis AI ─── */}
      <Dialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 44, height: 44, bgcolor: 'primary.light', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AutoFixHighIcon sx={{ color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', lineHeight: 1.2, fontWeight: 800 }}>
                  Insights Keuangan AI
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Rekomendasi Pintar Arina Agri
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setAiDialogOpen(false)} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', mb: 2 }}>
            <Box sx={{ bgcolor: '#f0fdf4', borderBottom: '1px solid', borderColor: 'divider', p: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Analisa Tren Saat Ini
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {AI_ANALYSIS}
              </Typography>
            </Box>
          </Box>
          <Button fullWidth variant="contained" onClick={() => setAiDialogOpen(false)} sx={{ borderRadius: 8 }}>
            Tutup Laporan
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
