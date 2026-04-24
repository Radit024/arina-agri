'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import InputAdornment from '@mui/material/InputAdornment';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStok } from '@/hooks/useStok';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { ApiHarvestBatch } from '@/lib/api';

// ─── Schemas ──────────────────────────────────────────────────────
const batchSchema = z.object({
  tanggalPanen: z.string().min(1, 'Wajib diisi'),
  grade: z.enum(['A', 'B', 'C']),
  beratMasuk: z.coerce.number().min(0.1, 'Minimal 0.1 kg'),
  hargaModal: z.coerce.number().min(1, 'Wajib diisi'),
  hargaJual: z.coerce.number().min(1, 'Wajib diisi'),
  lokasiPenyimpanan: z.enum(['Gudang Utama', 'Gudang Cadangan']),
  estimasiKadaluarsa: z.string().min(1, 'Wajib diisi'),
  catatan: z.string().optional(),
});

const stockOutSchema = z.object({
  batchId: z.string().min(1, 'Pilih batch'),
  berat: z.coerce.number().min(0.1, 'Minimal 0.1 kg'),
  tujuan: z.enum(['Pasar Lokal', 'Distributor', 'Restoran', 'Lainnya']),
  tanggal: z.string().min(1, 'Wajib diisi'),
  catatan: z.string().optional(),
});

type BatchFormInput = z.input<typeof batchSchema>;
type BatchFormOutput = z.output<typeof batchSchema>;
type StockOutFormInput = z.input<typeof stockOutSchema>;
type StockOutFormOutput = z.output<typeof stockOutSchema>;

// ─── Status badge ─────────────────────────────────────────────────
const StatusChip = ({ status }: { status: ApiHarvestBatch['status'] }) => {
  const map = {
    aman: { label: 'Aman', color: '#dcfce7', text: '#16a34a' },
    menipis: { label: 'Menipis', color: '#fef9c3', text: '#ca8a04' },
    hampir_kadaluarsa: { label: 'Hampir Kadaluarsa', color: '#fee2e2', text: '#dc2626' },
    habis: { label: 'Habis', color: '#f1f5f9', text: '#94a3b8' },
  };
  const s = map[status];
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.color, color: s.text, fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5 }}
    />
  );
};

// ─── Grade badge ──────────────────────────────────────────────────
const GradeChip = ({ grade }: { grade: 'A' | 'B' | 'C' }) => {
  const map = { A: '#16a34a', B: '#2563eb', C: '#f59e0b' };
  return (
    <Chip
      label={`Grade ${grade}`}
      size="small"
      sx={{ bgcolor: map[grade], color: 'white', fontWeight: 800, fontSize: '0.7rem', borderRadius: 1.5 }}
    />
  );
};

export default function StokPage() {
  const { batches, mutations, summary, loading, backendOnline, addBatch, deleteBatch, stockOut } = useStok();
  const [tab, setTab] = useState(0);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [stockOutDialogOpen, setStockOutDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ApiHarvestBatch | null>(null);
  const [mutFilter, setMutFilter] = useState('semua');

  const batchForm = useForm<BatchFormInput, unknown, BatchFormOutput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      tanggalPanen: new Date().toISOString().split('T')[0],
      grade: 'A',
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '',
      beratMasuk: 0,
      hargaModal: 0,
      hargaJual: 0,
      catatan: '',
    },
  });

  const stockOutForm = useForm<StockOutFormInput, unknown, StockOutFormOutput>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      batchId: '',
      berat: 0,
      tujuan: 'Pasar Lokal',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: '',
    },
  });

  const openAddBatch = () => {
    setEditingBatch(null);
    batchForm.reset({
      tanggalPanen: new Date().toISOString().split('T')[0],
      grade: 'A',
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '',
      beratMasuk: 0,
      hargaModal: 0,
      hargaJual: 0,
      catatan: '',
    });
    setBatchDialogOpen(true);
  };

  const onBatchSubmit = async (data: BatchFormOutput) => {
    await addBatch({
      ...data,
      catatan: data.catatan ?? '',
    });
    setBatchDialogOpen(false);
  };

  const onStockOutSubmit = async (data: StockOutFormOutput) => {
    await stockOut(data.batchId, {
      berat: data.berat,
      tujuan: data.tujuan,
      tanggal: data.tanggal,
      catatan: data.catatan || '',
    });
    setStockOutDialogOpen(false);
    stockOutForm.reset();
  };

  const alertBatches = batches.filter((b) => b.status === 'hampir_kadaluarsa');
  const activeBatches = batches.filter((b) => b.status !== 'habis');
  const filteredMutations = mutFilter === 'semua' ? mutations : mutations.filter((m) => m.batchCode.includes(`-${mutFilter}`));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            Manajemen Stok Panen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cabai Rawit — Desa Wonorejo, Malang
            {!backendOnline && (
              <Chip label="Mode Offline" size="small" sx={{ ml: 1.5, bgcolor: '#fef9c3', color: '#ca8a04', fontWeight: 600, fontSize: '0.65rem' }} />
            )}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<LocalShippingIcon />} onClick={() => setStockOutDialogOpen(true)} sx={{ borderRadius: 8 }}>
            Catat Keluar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddBatch} sx={{ borderRadius: 8 }}>
            Input Panen
          </Button>
        </Box>
      </Box>

      {/* Alert kadaluarsa */}
      {alertBatches.length > 0 && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 3, borderRadius: 3 }}>
          <strong>{alertBatches.length} batch</strong> hampir kadaluarsa:{' '}
          {alertBatches.map((b) => b.batchCode).join(', ')}. Segera prioritaskan penjualan!
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Stok Siap Jual', value: `${summary.totalStokSiapJual.toLocaleString('id-ID')} kg`, icon: <InventoryIcon />, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Terjual Minggu Ini', value: `${summary.stokTerjualMingguIni.toLocaleString('id-ID')} kg`, icon: <LocalShippingIcon />, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Estimasi Nilai Stok', value: formatRupiah(summary.estimasiNilaiStok), icon: <MonetizationOnIcon />, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Batch Hampir Kadaluarsa', value: `${summary.batchHampirKadaluarsa} batch`, icon: <WarningAmberIcon />, color: '#dc2626', bg: '#fff1f2' },
        ].map((kpi) => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>{kpi.label}</Typography>
                  <Typography variant="h6" sx={{ lineHeight: 1.2, color: kpi.color, fontWeight: 800 }}>{loading ? '...' : kpi.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ borderRadius: 4 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label="Daftar Batch Stok" />
          <Tab label="Riwayat Mutasi" />
        </Tabs>

        {/* Tab 1: Batch List */}
        {tab === 0 && (
          <CardContent sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['ID Batch', 'Tgl Panen', 'Grade', 'Berat Awal', 'Stok Tersisa', 'Harga Jual/kg', 'Lokasi', 'Kadaluarsa', 'Status', 'Aksi'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}>Memuat data...</TableCell></TableRow>
                  ) : activeBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                        <Typography variant="body2" color="text.secondary">Belum ada data batch panen.</Typography>
                        <Button size="small" onClick={openAddBatch} sx={{ mt: 1 }}>+ Input Panen Pertama</Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeBatches.map((b) => (
                      <TableRow key={b._id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{b.batchCode}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(b.tanggalPanen)}</TableCell>
                        <TableCell><GradeChip grade={b.grade} /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{b.beratMasuk} kg</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: b.stokTersisa < b.beratMasuk * 0.2 ? '#dc2626' : '#16a34a' }}>
                          {b.stokTersisa} kg
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatRupiah(b.hargaJual)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{b.lokasiPenyimpanan}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatDateShort(b.estimasiKadaluarsa)}</TableCell>
                        <TableCell><StatusChip status={b.status} /></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => { stockOutForm.setValue('batchId', b._id); setStockOutDialogOpen(true); }}
                              sx={{ color: '#2563eb', bgcolor: '#eff6ff', borderRadius: 1.5, '&:hover': { bgcolor: '#2563eb', color: 'white' } }}>
                              <LocalShippingIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => deleteBatch(b._id)}
                              sx={{ color: '#dc2626', bgcolor: '#fee2e2', borderRadius: 1.5, '&:hover': { bgcolor: '#dc2626', color: 'white' } }}>
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
        )}

        {/* Tab 2: Mutasi */}
        {tab === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter Grade</InputLabel>
                <Select value={mutFilter} label="Filter Grade" onChange={(e) => setMutFilter(e.target.value)}>
                  <MenuItem value="semua">Semua Grade</MenuItem>
                  <MenuItem value="A">Grade A</MenuItem>
                  <MenuItem value="B">Grade B</MenuItem>
                  <MenuItem value="C">Grade C</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Tanggal', 'Batch', 'Tipe', 'Berat (kg)', 'Tujuan', 'Catatan'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMutations.map((m) => (
                    <TableRow key={m._id} sx={{ '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(m.tanggal)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>{m.batchCode}</TableCell>
                      <TableCell>
                        <Chip
                          label={m.tipe === 'masuk' ? '↓ Masuk' : '↑ Keluar'}
                          size="small"
                          sx={{ bgcolor: m.tipe === 'masuk' ? '#dcfce7' : '#fee2e2', color: m.tipe === 'masuk' ? '#16a34a' : '#dc2626', fontWeight: 700, borderRadius: 1.5 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.berat} kg</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{m.tujuan || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 200 }}>
                        <Typography variant="caption" noWrap sx={{ display: 'block' }}>{m.catatan || '—'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
      </Card>

      {/* ─── Dialog: Input Batch Panen ─── */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>Input Batch Panen Baru</Typography>
            <IconButton size="small" onClick={() => setBatchDialogOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box component="form" onSubmit={batchForm.handleSubmit(onBatchSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="tanggalPanen" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="date" label="Tanggal Panen" fullWidth error={!!batchForm.formState.errors.tanggalPanen} slotProps={{ inputLabel: { shrink: true } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="grade" control={batchForm.control} render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Grade Cabai</InputLabel>
                    <Select {...field} label="Grade Cabai">
                      <MenuItem value="A">Grade A (Premium)</MenuItem>
                      <MenuItem value="B">Grade B (Standar)</MenuItem>
                      <MenuItem value="C">Grade C (Lokal)</MenuItem>
                    </Select>
                  </FormControl>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="beratMasuk" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="number" label="Berat Masuk (kg)" fullWidth error={!!batchForm.formState.errors.beratMasuk} helperText={batchForm.formState.errors.beratMasuk?.message} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="lokasiPenyimpanan" control={batchForm.control} render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Lokasi Penyimpanan</InputLabel>
                    <Select {...field} label="Lokasi Penyimpanan">
                      <MenuItem value="Gudang Utama">Gudang Utama</MenuItem>
                      <MenuItem value="Gudang Cadangan">Gudang Cadangan</MenuItem>
                    </Select>
                  </FormControl>
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="hargaModal" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="number" label="Harga Modal/kg (Rp)" fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller name="hargaJual" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="number" label="Harga Jual/kg (Rp)" fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">Rp</InputAdornment> } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller name="estimasiKadaluarsa" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} type="date" label="Estimasi Kadaluarsa" fullWidth error={!!batchForm.formState.errors.estimasiKadaluarsa} slotProps={{ inputLabel: { shrink: true } }} />
                )} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller name="catatan" control={batchForm.control} render={({ field }) => (
                  <TextField {...field} label="Catatan (opsional)" multiline rows={2} fullWidth />
                )} />
              </Grid>
            </Grid>
            <Divider />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="inherit" onClick={() => setBatchDialogOpen(false)} sx={{ flex: 1, borderRadius: 8 }}>Batal</Button>
              <Button type="submit" variant="contained" sx={{ flex: 2, borderRadius: 8 }}>Simpan Batch</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Catat Keluar Stok ─── */}
      <Dialog open={stockOutDialogOpen} onClose={() => setStockOutDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>Catat Keluar Stok</Typography>
            <IconButton size="small" onClick={() => setStockOutDialogOpen(false)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box component="form" onSubmit={stockOutForm.handleSubmit(onStockOutSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Controller name="batchId" control={stockOutForm.control} render={({ field }) => (
              <FormControl fullWidth error={!!stockOutForm.formState.errors.batchId}>
                <InputLabel>Pilih Batch</InputLabel>
                <Select {...field} label="Pilih Batch">
                  {activeBatches.map((b) => (
                    <MenuItem key={b._id} value={b._id}>{b.batchCode} — tersisa {b.stokTersisa} kg</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )} />
            <Controller name="berat" control={stockOutForm.control} render={({ field }) => (
              <TextField {...field} type="number" label="Berat Keluar (kg)" fullWidth error={!!stockOutForm.formState.errors.berat} helperText={stockOutForm.formState.errors.berat?.message} />
            )} />
            <Controller name="tujuan" control={stockOutForm.control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Tujuan Pengiriman</InputLabel>
                <Select {...field} label="Tujuan Pengiriman">
                  {['Pasar Lokal', 'Distributor', 'Restoran', 'Lainnya'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            )} />
            <Controller name="tanggal" control={stockOutForm.control} render={({ field }) => (
              <TextField {...field} type="date" label="Tanggal Transaksi" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            )} />
            <Controller name="catatan" control={stockOutForm.control} render={({ field }) => (
              <TextField {...field} label="Catatan (opsional)" multiline rows={2} fullWidth />
            )} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="inherit" onClick={() => setStockOutDialogOpen(false)} sx={{ flex: 1, borderRadius: 8 }}>Batal</Button>
              <Button type="submit" variant="contained" color="error" sx={{ flex: 2, borderRadius: 8 }}>Keluarkan Stok</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
