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
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloseIcon from '@mui/icons-material/Close';
import useLocalStorage from '@/hooks/useLocalStorage';
import { mockTransactions } from '@/lib/mockData';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { Transaction } from '@/lib/mockData';

const transactionSchema = z.object({
  jenis: z.enum(['pengeluaran', 'pendapatan'], { required_error: 'Pilih jenis transaksi' }),
  kategori: z.string().min(1, 'Pilih kategori'),
  nominal: z.string().min(1, 'Masukkan nominal').refine((v) => !isNaN(Number(v.replace(/\./g, ''))) && Number(v.replace(/\./g, '')) > 0, 'Nominal harus lebih dari 0'),
  tanggal: z.string().min(1, 'Pilih tanggal'),
  keterangan: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const kategoriOptions = ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi', 'Penjualan', 'Lainnya'];

const AI_ANALYSIS = `Berdasarkan data keuangan bulan April 2026, laporan menunjukkan performa yang cukup baik. Total pendapatan sebesar Rp 5.000.000 melampaui total pengeluaran sebesar Rp 1.825.000, menghasilkan laba bersih estimasi Rp 3.175.000 dengan rasio B/C sebesar 2.74 — artinya setiap Rp 1 yang diinvestasikan menghasilkan Rp 2.74 keuntungan.

Komponen biaya terbesar adalah tenaga kerja (41%), diikuti pupuk (24.7%) dan pestisida (17.5%). Ini pola yang wajar untuk fase pembibitan hingga panen perdana cabai rawit.

Rekomendasi AI:
• Pertahankan efisiensi biaya pupuk dengan beralih ke pupuk organik kompos sebagai campuran NPK (bisa hemat 15-20%).
• Pertimbangkan sistem bagi hasil untuk tenaga kerja panen agar lebih fleksibel secara kas.
• Dengan harga jual cabai saat ini Rp 40.000/kg, lakukan pemetikan rutin setiap 3-4 hari untuk memaksimalkan kualitas dan harga.
• Proyeksi bulan Mei: jika produksi mencapai 120kg, pendapatan bisa mencapai Rp 4.800.000.`;

export default function KeuanganPage() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('arina-transactions', mockTransactions);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { jenis: 'pengeluaran', kategori: '', nominal: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' },
  });

  const selectedJenis = watch('jenis');

  const kategoriFiltered =
    selectedJenis === 'pendapatan'
      ? ['Penjualan', 'Lainnya']
      : ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi', 'Lainnya'];

  const onSubmit = (data: TransactionFormData) => {
    const newTx: Transaction = {
      id: Date.now().toString(),
      jenis: data.jenis,
      kategori: data.kategori,
      nominal: Number(data.nominal.replace(/\./g, '')),
      tanggal: data.tanggal,
      keterangan: data.keterangan || '',
    };
    setTransactions((prev) => [newTx, ...prev]);
    reset();
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNominalChange = (value: string, onChange: (v: string) => void) => {
    const raw = value.replace(/\D/g, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    onChange(formatted);
  };

  const totalPendapatan = transactions.filter((t) => t.jenis === 'pendapatan').reduce((a, t) => a + t.nominal, 0);
  const totalPengeluaran = transactions.filter((t) => t.jenis === 'pengeluaran').reduce((a, t) => a + t.nominal, 0);
  const labaBersih = totalPendapatan - totalPengeluaran;
  const bcRatio = totalPengeluaran > 0 ? (totalPendapatan / totalPengeluaran).toFixed(2) : '0.00';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
          Pencatatan Keuangan
        </Typography>
        <Typography variant="body2" color="text.secondary">Catat pemasukan dan pengeluaran usaha tani Anda</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Form */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Tambah Transaksi</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Controller name="jenis" control={control} render={({ field }) => (
                  <FormControl fullWidth error={!!errors.jenis}>
                    <InputLabel>Jenis Transaksi</InputLabel>
                    <Select {...field} label="Jenis Transaksi">
                      <MenuItem value="pengeluaran">Pengeluaran</MenuItem>
                      <MenuItem value="pendapatan">Pendapatan</MenuItem>
                    </Select>
                    {errors.jenis && <FormHelperText>{errors.jenis.message}</FormHelperText>}
                  </FormControl>
                )} />

                <Controller name="kategori" control={control} render={({ field }) => (
                  <FormControl fullWidth error={!!errors.kategori}>
                    <InputLabel>Kategori</InputLabel>
                    <Select {...field} label="Kategori">
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
                    label="Nominal (Rp)"
                    placeholder="0"
                    error={!!errors.nominal}
                    helperText={errors.nominal?.message}
                    fullWidth
                    InputProps={{ startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>Rp</Typography> }}
                  />
                )} />

                <Controller name="tanggal" control={control} render={({ field }) => (
                  <TextField {...field} type="date" label="Tanggal" error={!!errors.tanggal} helperText={errors.tanggal?.message} fullWidth InputLabelProps={{ shrink: true }} />
                )} />

                <Controller name="keterangan" control={control} render={({ field }) => (
                  <TextField {...field} label="Keterangan (opsional)" multiline rows={2} placeholder="Contoh: Pupuk NPK Phonska 50kg" fullWidth />
                )} />

                <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 1 }}>
                  Simpan Transaksi
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Laporan Laba Rugi */}
          <Card sx={{ mt: 3 }}>
            <CardHeader
              title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Laporan Laba Rugi</Typography>}
              action={
                <Button startIcon={<AutoFixHighIcon />} size="small" variant="outlined" onClick={() => setAiDialogOpen(true)}>
                  Analisis AI
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {[
                { label: 'Total Pemasukan', value: formatRupiah(totalPendapatan), color: 'success.main' },
                { label: 'Total Pengeluaran', value: formatRupiah(totalPengeluaran), color: 'error.main' },
              ].map((item) => (
                <Box key={item.label} className="flex justify-between items-center py-2">
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: item.color }}>{item.value}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box className="flex justify-between items-center py-1">
                <Typography variant="body1" fontWeight={700}>Laba Bersih</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: labaBersih >= 0 ? 'success.main' : 'error.main' }}>
                  {formatRupiah(labaBersih)}
                </Typography>
              </Box>
              <Box className="flex justify-between items-center py-1">
                <Typography variant="body2" color="text.secondary">Rasio B/C</Typography>
                <Chip
                  label={`${bcRatio}x`}
                  size="small"
                  sx={{ backgroundColor: Number(bcRatio) >= 1 ? '#dcfce7' : '#fee2e2', color: Number(bcRatio) >= 1 ? '#16a34a' : '#dc2626', fontWeight: 700 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Transactions Table */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Riwayat Transaksi</Typography>}
              subheader={`${transactions.length} transaksi tercatat`}
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer sx={{ maxHeight: 560, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Tanggal', 'Kategori', 'Keterangan', 'Jenis', 'Nominal', 'Aksi'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', backgroundColor: 'background.paper' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{formatDateShort(tx.tanggal)}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{tx.kategori}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: 180 }}>
                          <Typography variant="caption" noWrap display="block">{tx.keterangan}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={tx.jenis === 'pendapatan' ? 'Pemasukan' : 'Pengeluaran'} size="small"
                            sx={{ backgroundColor: tx.jenis === 'pendapatan' ? '#dcfce7' : '#fee2e2', color: tx.jenis === 'pendapatan' ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main' }}>
                          {tx.jenis === 'pendapatan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleDelete(tx.id)} sx={{ color: 'error.main' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
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
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box className="flex items-center justify-between">
            <Box className="flex items-center gap-2">
              <AutoFixHighIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Analisis Keuangan AI</Typography>
            </Box>
            <IconButton onClick={() => setAiDialogOpen(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 2,
              p: 2.5,
              mb: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Analisis oleh Arina AI · April 2026
            </Typography>
          </Box>
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {AI_ANALYSIS}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
