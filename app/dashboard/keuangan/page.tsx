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
import DeleteIcon from '@mui/icons-material/Delete';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import useLocalStorage from '@/hooks/useLocalStorage';
import { mockTransactions } from '@/lib/mockData';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { Transaction } from '@/lib/mockData';
import { PieChart } from '@mui/x-charts/PieChart';

const transactionSchema = z.object({
  jenis: z.enum(['pengeluaran', 'pendapatan'], { required_error: 'Pilih jenis transaksi' }),
  kategori: z.string().min(1, 'Pilih kategori'),
  nominal: z.string().min(1, 'Masukkan nominal').refine((v) => !isNaN(Number(v.replace(/\./g, ''))) && Number(v.replace(/\./g, '')) > 0, 'Nominal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Pilih tanggal'),
  keterangan: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const AI_ANALYSIS = `Berdasarkan pantauan arus kas Anda saat ini, laporan menunjukkan performa yang cukup baik. Terdapat kas positif yang masuk stabil.
Komponen biaya terbesar Anda didominasi oleh sarana pemeliharaan konvensional (Pupuk & Pestisida).

💡 Rekomendasi Arina AI:
• Pertahankan efisiensi biaya pupuk dengan menyelingi penggunaan pupuk organik kompos limbah (potensi hemat 10-15%).
• Pencatatan transaksi disarankan dilakukan maksimal setiap 3 hari sekali agar tidak ada nota yang hilang.
• Kas Anda terlihat positif bulan ini. Sangat disarankan menyisihkan 20% dari dana segar untuk dijadikan "Dana Darurat Lahan" untuk modal perbaikan alat atau perubahan iklim ekstrem di depan.`;

export default function KeuanganPage() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('arina-transactions', mockTransactions);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filtering States
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pengeluaran' | 'pendapatan'>('semua');

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { jenis: 'pengeluaran', kategori: '', nominal: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' },
  });

  const selectedJenis = watch('jenis');

  const kategoriFiltered =
    selectedJenis === 'pendapatan'
      ? ['Penjualan Hasil Panen', 'Layanan Jasa', 'Lainnya']
      : ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi & Air', 'Alat Tani', 'Lainnya'];

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
      setTransactions((prev) => prev.map((t) => t.id === editingId ? txData : t));
      setEditingId(null);
    } else {
      setTransactions((prev) => [txData, ...prev]);
    }
    reset({ jenis: 'pengeluaran', kategori: '', nominal: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    reset({
      jenis: tx.jenis as any,
      kategori: tx.kategori,
      nominal: tx.nominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
      tanggal: tx.tanggal,
      keterangan: tx.keterangan,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset({ jenis: 'pengeluaran', kategori: '', nominal: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExportCSV = () => {
    const headers = ['Tanggal,Kategori,Keterangan,Jenis,Nominal'];
    const csvStr = transactions.map(t => `${t.tanggal},"${t.kategori}","${t.keterangan?.replace(/"/g, '""') || ''}",${t.jenis},${t.nominal}`).join('\n');
    const blob = new Blob([headers.join('\n') + '\n' + csvStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Keuangan_Arina_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleNominalChange = (value: string, onChange: (v: string) => void) => {
    const raw = value.replace(/\D/g, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    onChange(formatted);
  };

  // Summaries
  const totalPendapatan = transactions.filter((t) => t.jenis === 'pendapatan').reduce((a, t) => a + t.nominal, 0);
  const totalPengeluaran = transactions.filter((t) => t.jenis === 'pengeluaran').reduce((a, t) => a + t.nominal, 0);
  const labaBersih = totalPendapatan - totalPengeluaran;

  // Pie Chart Data mapping based on actual recorded data categories
  const expenseCategoriesStats = ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi & Air', 'Alat Tani', 'Lainnya'].map(k => {
    const total = transactions.filter(t => t.jenis === 'pengeluaran' && t.kategori === k).reduce((a,b) => a+b.nominal, 0);
    return { id: k, value: total, label: k };
  }).filter(item => item.value > 0);
  
  // Fallback pie data if no data yet to prevent empty chart error
  const finalPieData = expenseCategoriesStats.length > 0 ? expenseCategoriesStats : [{ id: 'Kosong', value: 1, label: 'Belum Ada Data' }];
  const pieColors = expenseCategoriesStats.length > 0 ? ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#64748b'] : ['#e2e8f0'];
  const legendExpenseData = expenseCategoriesStats.length > 0 ? expenseCategoriesStats : [{ id: 'Kosong', value: 0, label: 'Belum Ada Data' }];

  // Filter Data for Table
  const displayedTransactions = transactions.filter(t => filterJenis === 'semua' || t.jenis === filterJenis);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
            Manajemen Keuangan
          </Typography>
          <Typography variant="body2" color="text.secondary">Kelola pemasukan dan telusuri profil pengeluaran kebun Anda secara terpadu.</Typography>
        </Box>
        <Box>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} color="success" sx={{ borderRadius: 8, bgcolor: 'background.paper', boxShadow: 1 }}>
            Eksport Laporan CSV
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Kolom Kiri: Visualisasi & Form */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Laporan Laba Rugi Visuals */}
          <Card sx={{ mb: 3, position: 'relative', overflow: 'visible', borderColor: 'primary.main', borderWidth: 2 }}>
            <CardHeader
              title={<Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>Ringkasan Bisnis</Typography>}
              action={
                <IconButton onClick={() => setAiDialogOpen(true)} sx={{ color: 'primary.dark', bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
                  <AutoFixHighIcon fontSize="small"/>
                </IconButton>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <Box className="flex justify-between items-end mb-4">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Pemasukan</Typography>
                  <Typography variant="h6" fontWeight={800} color="success.main">{formatRupiah(totalPendapatan)}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Pengeluaran</Typography>
                  <Typography variant="h6" fontWeight={800} color="error.main">{formatRupiah(totalPengeluaran)}</Typography>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: labaBersih >= 0 ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)', borderRadius: 3, mb: 1, border: '1px solid', borderColor: labaBersih >= 0 ? '#bbf7d0' : '#fecaca' }}>
                <Box className="flex justify-between items-center">
                  <Typography variant="body2" fontWeight={800} sx={{ color: labaBersih >= 0 ? '#15803d' : '#991b1b' }}>
                    {labaBersih >= 0 ? 'Estimasi Laba Bersih' : 'Defisit Anggaran'}
                  </Typography>
                  <Typography variant="h5" fontWeight={900} sx={{ fontFamily: 'var(--font-sora)', color: labaBersih >= 0 ? 'success.main' : 'error.main' }}>
                    {formatRupiah(Math.abs(labaBersih))}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
                  Distribusi Pengeluaran
                </Typography>
                <PieChart
                  series={[
                    {
                      data: finalPieData,
                      innerRadius: 40,
                      outerRadius: 85,
                      paddingAngle: expenseCategoriesStats.length > 0 ? 4 : 0,
                      cornerRadius: 5,
                      cx: 100,
                    },
                  ]}
                  colors={pieColors}
                  width={260}
                  height={180}
                />

                <Box sx={{ mt: 0.5, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.75 }}>
                  {legendExpenseData.map((item, index) => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: pieColors[index % pieColors.length], flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Form Create/Edit */}
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
              {editingId ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
            </Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Controller name="jenis" control={control} render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.jenis}>
                        <InputLabel>Jenis M/K</InputLabel>
                        <Select {...field} label="Jenis M/K">
                          <MenuItem value="pendapatan">Pemasukan (+)</MenuItem>
                          <MenuItem value="pengeluaran">Pengeluaran (-)</MenuItem>
                        </Select>
                      </FormControl>
                    )} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Controller name="tanggal" control={control} render={({ field }) => (
                      <TextField {...field} type="date" label="Tanggal" size="small" error={!!errors.tanggal} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                    )} />
                  </Grid>
                </Grid>

                <Controller name="kategori" control={control} render={({ field }) => (
                  <FormControl fullWidth error={!!errors.kategori}>
                    <InputLabel>Kategori Transaksi</InputLabel>
                    <Select {...field} label="Kategori Transaksi">
                      {kategoriFiltered.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                    </Select>
                    {errors.kategori && <FormHelperText>{errors.kategori.message}</FormHelperText>}
                  </FormControl>
                )} />

                <Controller name="nominal" control={control} render={({ field: { value, onChange, ...rest } }) => (
                  <TextField
                    {...rest}
                    value={value}
                    onChange={(e) => handleNominalChange(e.target.value, onChange)}
                    label="Nominal Rp"
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
                )} />

                <Controller name="keterangan" control={control} render={({ field }) => (
                  <TextField {...field} label="Catatan / Detail (opsional)" multiline rows={2} fullWidth placeholder={selectedJenis === 'pengeluaran' ? "Cth: Beli 2 sak Phonska di toko pak tani" : "Cth: Laku 50kg tomat ke tengkulak"}/>
                )} />

                <Box className="flex gap-3 mt-2">
                  {editingId && (
                    <Button variant="outlined" color="inherit" onClick={handleCancelEdit} sx={{ flex: 1, borderRadius: 8 }}>
                      Batal
                    </Button>
                  )}
                  <Button type="submit" variant="contained" sx={{ flex: 2, borderRadius: 8, bgcolor: selectedJenis === 'pendapatan' ? '#16a34a' : '#1e293b' }}>
                    {editingId ? 'Perbarui Data' : 'Simpan ke Buku Masuk'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

        </Grid>

        {/* Kolom Kanan: Transactions Table */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={<Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>Buku Besar Transaksi</Typography>}
              subheader={`${displayedTransactions.length} rekaman ditampilkan`}
              action={
                <FormControl size="small" sx={{ minWidth: 160, mt: 1 }}>
                  <InputLabel>Filter Tipe Transaksi</InputLabel>
                  <Select value={filterJenis} label="Filter Tipe Transaksi" onChange={(e) => setFilterJenis(e.target.value as any)}>
                    <MenuItem value="semua">Tampilkan Semua</MenuItem>
                    <MenuItem value="pendapatan">Semua Pemasukan</MenuItem>
                    <MenuItem value="pengeluaran">Semua Pengeluaran</MenuItem>
                  </Select>
                </FormControl>
              }
            />
            <CardContent sx={{ pt: 0, flex: 1, p: 0 }}>
              <TableContainer sx={{ maxHeight: { xs: 500, lg: 850 }, overflow: 'auto', px: 2, pb: 2 }}>
                <Table size="medium" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Tanggal', 'Kategori', 'Detail', 'Tipe', 'Nilai (Rp)', 'Opsi'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', backgroundColor: 'background.paper' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedTransactions.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                             <Typography variant="body2" color="text.secondary">Belum ada transaksi ditemukan untuk filter ini.</Typography>
                         </TableCell>
                      </TableRow>
                    ) : displayedTransactions.map((tx) => (
                      <TableRow key={tx.id} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary', minWidth: 90 }}>{formatDateShort(tx.tanggal)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{tx.kategori}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 220, WebkitLineClamp: 2, overflow: 'hidden' }}>
                          {tx.keterangan || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip label={tx.jenis === 'pendapatan' ? 'Pemasukan' : 'Pengeluaran'} size="small"
                            sx={{ backgroundColor: tx.jenis === 'pendapatan' ? '#dcfce7' : '#fee2e2', color: tx.jenis === 'pendapatan' ? '#16a34a' : '#dc2626', fontWeight: 800, fontSize: '0.7rem', borderRadius: 1.5 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.9rem', color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main' }}>
                          {tx.jenis === 'pendapatan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton size="small" aria-label="Edit Transaksi" onClick={() => handleEdit(tx)} sx={{ borderRadius: 2, color: 'primary.main', bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" aria-label="Hapus Transaksi" onClick={() => handleDelete(tx.id)} sx={{ borderRadius: 2, color: 'error.main', bgcolor: '#fee2e2', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Analysis Dialog */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box className="flex items-center justify-between">
            <Box className="flex items-center gap-2">
              <Box sx={{ width: 44, height: 44, bgcolor: 'primary.light', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AutoFixHighIcon sx={{ color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ fontFamily: 'var(--font-sora)', lineHeight: 1.2 }}>Insights Bisnis AI</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Rekomendasi Pintar Arina Agri</Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setAiDialogOpen(false)} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ backgroundColor: 'transparent', borderRadius: 3, p: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#f0fdf4', borderBottom: '1px solid', borderColor: 'divider', p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
               <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                 Analisa Tren - April 2026
               </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {AI_ANALYSIS}
              </Typography>
            </Box>
          </Box>
          <Button fullWidth variant="contained" onClick={() => setAiDialogOpen(false)} sx={{ mt: 3, borderRadius: 8 }}>
            Tutup Laporan
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
