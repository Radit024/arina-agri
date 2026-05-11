'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { useTheme, alpha } from '@mui/material/styles';

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
import { useTranslations } from 'next-intl';
import { aiApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { generatePdfReport, getPeriodeLabel } from '@/lib/pdfReport';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import { useTransactions } from '@/hooks/useTransactions';
import type { ApiTransaction } from '@/lib/api';
import Snackbar from '@mui/material/Snackbar';
import DialogActions from '@mui/material/DialogActions';

const transactionSchema = z.object({
  jenis: z.enum(['pengeluaran', 'pendapatan'], { message: 'type' }),
  kategori: z.string().min(1, 'category'),
  nominal: z.string().min(1, 'amount').refine(
    (v) => !isNaN(Number(v.replace(/\./g, ''))) && Number(v.replace(/\./g, '')) > 0,
    'amountPositive'
  ),
  tanggal: z.string().min(1, 'date'),
  keterangan: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

type BepHppInputs = {
  biayaTetap: number;
  jumlahProduksi: number;
  hargaJualPerUnit: number;
};



const MAX_AI_REPORTS_PER_MONTH = 3;

interface QuotaState {
  month: string; // format YYYY-MM
  used: number;
}

export default function KeuanganPage() {
  const t = useTranslations('Finance');
  const tCommon = useTranslations('Common');
  const BULAN_LABELS = [
    tCommon('months.january'), tCommon('months.february'), tCommon('months.march'),
    tCommon('months.april'), tCommon('months.may'), tCommon('months.june'),
    tCommon('months.july'), tCommon('months.august'), tCommon('months.september'),
    tCommon('months.october'), tCommon('months.november'), tCommon('months.december')
  ];
  const { user } = useAuth();
  
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  
  const bepKey = `arina-bep-hpp-inputs-${user?.id || 'guest'}`;
  const [bepHppInputs, setBepHppInputs] = useLocalStorage<BepHppInputs>(bepKey, {
    biayaTetap: 0,
    jumlahProduksi: 0,
    hargaJualPerUnit: 0,
  });
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const aiQuotaKey = `arina-ai-report-quota-${user?.id || 'guest'}`;
  const [aiReportQuota, setAiReportQuota] = useLocalStorage<QuotaState>(
    aiQuotaKey,
    { month: '', used: 0 }
  );
  const [bepHppDialogOpen, setBepHppDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [filterBulan, setFilterBulan] = useState('semua');
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pengeluaran' | 'pendapatan'>('semua');

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema.extend({
      jenis: z.enum(['pengeluaran', 'pendapatan'], { message: t('validation.type') }),
      kategori: z.string().min(1, t('validation.category')),
      nominal: z.string().min(1, t('validation.amount')).refine(
        (v) => !isNaN(Number(v.replace(/\./g, ''))) && Number(v.replace(/\./g, '')) > 0,
        t('validation.amountPositive')
      ),
      tanggal: z.string().min(1, t('validation.date')),
    })),
    defaultValues: {
      jenis: 'pengeluaran',
      kategori: '',
      nominal: '',
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
    },
  });

  const selectedJenis = watch('jenis');

  const kategoriFiltered = useMemo(
    () =>
      selectedJenis === 'pendapatan'
        ? [t('categories.harvestSales'), t('categories.service'), t('categories.other')]
        : [t('categories.fertilizer'), t('categories.pesticide'), t('categories.labor'), t('categories.irrigation'), t('categories.tools'), t('categories.other')],
    [selectedJenis, t]
  );

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

  const handleEdit = (tx: ApiTransaction) => {
    setEditingId(tx._id);
    reset({
      jenis: tx.jenis,
      kategori: tx.kategori,
      nominal: tx.nominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
      tanggal: tx.tanggal,
      keterangan: tx.keterangan,
    });
    setTxDialogOpen(true);
  };

  const onSubmit = async (data: TransactionFormData) => {
    const txData = {
      jenis: data.jenis,
      kategori: data.kategori,
      nominal: Number(data.nominal.replace(/\./g, '')),
      tanggal: data.tanggal,
      keterangan: data.keterangan || '',
    };

    if (editingId) {
      await updateTransaction(editingId, txData);
      setSnackbar({ open: true, message: 'Transaksi berhasil diperbarui', severity: 'success' });
    } else {
      await addTransaction(txData);
      setSnackbar({ open: true, message: 'Transaksi berhasil dicatat', severity: 'success' });
    }

    setTxDialogOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteTransaction(deleteConfirmId);
    setDeleteConfirmId(null);
    setSnackbar({ open: true, message: 'Transaksi berhasil dihapus', severity: 'success' });
  };

  const handleNominalChange = (value: string, onChange: (v: string) => void) => {
    const raw = value.replace(/\D/g, '');
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    onChange(formatted);
  };

  const handleBepHppInputChange = useCallback((field: keyof BepHppInputs, rawValue: string) => {
    const numericValue = Math.max(0, Number(rawValue) || 0);
    setBepHppInputs((prev) => ({
      ...prev,
      [field]: numericValue,
    }));
  }, [setBepHppInputs]);

  const getBepHppInputDisplayValue = (value: number) => (value === 0 ? '' : String(value));

  const handleExportExcel = async () => {
    const [ExcelJS, { saveAs }] = await Promise.all([
      import('exceljs').then(m => m.default),
      import('file-saver'),
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Buku Keuangan');

    // Add Title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = t('excel.reportTitle');
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]); // Empty row

    // Add Headers
    const headerRow = worksheet.addRow([
      t('ledger.columns.date'), 
      t('ledger.columns.category'), 
      t('ledger.columns.note'), 
      t('ledger.columns.type'), 
      t('ledger.columns.value')
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    transactions.forEach((tx) => {
      const row = worksheet.addRow([
        tx.tanggal,
        tx.kategori,
        tx.keterangan || '-',
        tx.jenis === 'pendapatan' ? t('common.income') : t('common.expense'),
        tx.nominal
      ]);
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (colNumber === 5) {
          cell.numFmt = '"Rp"#,##0';
        }
      });
    });

    // Adjust column widths
    worksheet.columns = [
      { width: 15 },
      { width: 25 },
      { width: 40 },
      { width: 15 },
      { width: 20 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${t('excel.filename')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ─── AI Quota helpers ──────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const quotaThisMonth = aiReportQuota.month === currentMonth ? aiReportQuota.used : 0;
  const aiQuotaRemaining = MAX_AI_REPORTS_PER_MONTH - quotaThisMonth;

  const consumeAiQuota = () => {
    setAiReportQuota({ month: currentMonth, used: quotaThisMonth + 1 });
  };

  // ─── Generate PDF (manual, tanpa AI) ──────────────────────────
  const handleGeneratePdfManual = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      await generatePdfReport({
        periode: filterBulan === 'semua' ? 'semua' : filterBulan,
        periodeLabel: filterBulan === 'semua' ? t('filters.allMonths') : getPeriodeLabel(filterBulan),
        totalPendapatan,
        totalPengeluaran,
        labaBersih,
        transactions: monthFilteredTransactions.map(tx => ({ ...tx, id: tx._id })),
        userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || undefined,
      });
    } catch {
      setReportError(t('reportDialog.error.failed'));
    } finally {
      setReportLoading(false);
    }
  };

  // ─── Generate PDF (dengan AI Saran) ────────────────────────────
  const handleGeneratePdfAI = async () => {
    if (aiQuotaRemaining <= 0) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const periodeLabel = filterBulan === 'semua' ? t('filters.allMonths') : getPeriodeLabel(filterBulan);
      const result = await aiApi.generateFinancialReport({
        periode: periodeLabel,
        totalPendapatan,
        totalPengeluaran,
        labaBersih,
        userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || undefined,
        transactions: monthFilteredTransactions.map((tx) => ({
          jenis: tx.jenis,
          kategori: tx.kategori,
          nominal: tx.nominal,
          tanggal: tx.tanggal,
          keterangan: tx.keterangan,
        })),
      });
      consumeAiQuota();
      await generatePdfReport({
        periode: filterBulan === 'semua' ? 'semua' : filterBulan,
        periodeLabel,
        totalPendapatan,
        totalPengeluaran,
        labaBersih,
        transactions: monthFilteredTransactions.map(tx => ({ ...tx, id: tx._id })),
        userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || undefined,
        aiAnalysis: result.analysis,
      });
    } catch {
      setReportError(t('reportDialog.error.aiFailed'));
    } finally {
      setReportLoading(false);
    }
  };

  const monthFilteredTransactions = useMemo(
    () => transactions.filter((t) => filterBulan === 'semua' || t.tanggal.startsWith(filterBulan)),
    [transactions, filterBulan]
  );

  // Summaries
  const { totalPendapatan, totalPengeluaran } = useMemo(() => {
    let pendapatan = 0;
    let pengeluaran = 0;
    monthFilteredTransactions.forEach((tx) => {
      if (tx.jenis === 'pendapatan') {
        pendapatan += tx.nominal;
      } else if (tx.jenis === 'pengeluaran') {
        pengeluaran += tx.nominal;
      }
    });
    return { totalPendapatan: pendapatan, totalPengeluaran: pengeluaran };
  }, [monthFilteredTransactions]);
  const labaBersih = totalPendapatan - totalPengeluaran;

  // HPP & BEP calculations
  const biayaTetap = bepHppInputs.biayaTetap;
  const jumlahProduksi = bepHppInputs.jumlahProduksi;
  const hargaJualPerUnit = bepHppInputs.hargaJualPerUnit;

  const totalBiayaProduksi = totalPengeluaran;
  const biayaVariabelTotal = Math.max(totalPengeluaran - biayaTetap, 0);
  const biayaVariabelPerUnit = jumlahProduksi > 0 ? biayaVariabelTotal / jumlahProduksi : 0;
  const hppPerUnit = jumlahProduksi > 0 ? totalBiayaProduksi / jumlahProduksi : 0;

  const marginKontribusiPerUnit = hargaJualPerUnit - biayaVariabelPerUnit;
  const bepUnit = marginKontribusiPerUnit > 0 ? biayaTetap / marginKontribusiPerUnit : null;

  const marginKontribusiRasio = totalPendapatan > 0 ? 1 - (biayaVariabelTotal / totalPendapatan) : null;
  const bepRupiah = marginKontribusiRasio !== null && marginKontribusiRasio > 0 ? biayaTetap / marginKontribusiRasio : null;

  const formatAngka = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
  const biayaTetapDisplayValue = getBepHppInputDisplayValue(bepHppInputs.biayaTetap);
  const hargaJualDisplayValue = getBepHppInputDisplayValue(bepHppInputs.hargaJualPerUnit);

  // Pie chart data
  const normalizeCategory = (value: string) => value.trim().toLowerCase();
  const theme = useTheme();
  const pieColors = [
    theme.palette.error.main,     // Pestisida
    theme.palette.success.main,   // Pupuk
    theme.palette.info.main,      // Tenaga Kerja
    theme.palette.primary.main,   // Irigasi
    theme.palette.warning.main,   // Alat Tani
    theme.palette.text.secondary, // Lainnya
  ];
  const expenseStats = useMemo(
    () =>
      [
        { id: 'pesticide', label: t('categories.pesticide'), aliases: [t('categories.pesticide'), 'Pestisida', 'Pesticide'], color: theme.palette.error.main },
        { id: 'fertilizer', label: t('categories.fertilizer'), aliases: [t('categories.fertilizer'), 'Pupuk', 'Fertilizer'], color: theme.palette.success.main },
        { id: 'labor', label: t('categories.labor'), aliases: [t('categories.labor'), 'Tenaga Kerja', 'Labor'], color: theme.palette.info.main },
        { id: 'irrigation', label: t('categories.irrigation'), aliases: [t('categories.irrigation'), 'Irigasi & Air', 'Irrigation & Water'], color: theme.palette.primary.main },
        { id: 'tools', label: t('categories.tools'), aliases: [t('categories.tools'), 'Alat Tani', 'Farm Tools'], color: theme.palette.warning.main },
        { id: 'other', label: t('categories.other'), aliases: [t('categories.other'), 'Lainnya', 'Other'], color: theme.palette.text.secondary },
      ]
        .map((category) => {
          const aliases = category.aliases.map(normalizeCategory);
          let value = 0;
          monthFilteredTransactions.forEach((tx) => {
            if (tx.jenis === 'pengeluaran' && aliases.includes(normalizeCategory(tx.kategori))) {
              value += tx.nominal;
            }
          });

          return {
            id: category.id,
            value,
            label: category.label,
            color: category.color,
          };
        })
        .filter((item) => item.value > 0),
    [t, monthFilteredTransactions, theme]
  );

  const finalPieData = useMemo(
    () => (expenseStats.length > 0 ? expenseStats : [{ id: 'Kosong', value: 1, label: t('distribution.empty'), color: '#e2e8f0' }]),
    [expenseStats, t]
  );
  const finalPieColors = useMemo(
    () => (expenseStats.length > 0 ? expenseStats.map((e) => e.color) : ['#e2e8f0']),
    [expenseStats]
  );

  const bulanOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((t) => t.tanggal.slice(0, 7))
            .filter((bulanKey) => /^\d{4}-\d{2}$/.test(bulanKey))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [transactions]
  );

  const getBulanLabel = (bulanKey: string) => {
    const [tahun, bulan] = bulanKey.split('-');
    const monthIndex = Number(bulan) - 1;
    if (monthIndex < 0 || monthIndex > 11 || Number.isNaN(monthIndex)) {
      return bulanKey;
    }
    return `${BULAN_LABELS[monthIndex]} ${tahun}`;
  };

  // Filtered table data
  const displayedTransactions = useMemo(
    () => monthFilteredTransactions.filter((t) => (filterJenis === 'semua' || t.jenis === filterJenis)),
    [monthFilteredTransactions, filterJenis]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: { md: 'calc(100dvh - 96px)' }, display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
              {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
              {t('subtitle')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportExcel}
          color="success"
          sx={{ borderRadius: 8, bgcolor: 'background.paper', boxShadow: 1, whiteSpace: 'nowrap' }}
        >
          {t('exportCsv')}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, alignItems: 'stretch' }}>
        {/* ─── KIRI: Buku Besar Transaksi (BESAR) ─── */}
        <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
          <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('ledger.title')}
                </Typography>
              }
              subheader={t('ledger.subheader', { count: displayedTransactions.length })}
              sx={{ pb: 1 }}
            />

            {/* Responsive Toolbar Row */}
            <Box
              sx={{
                px: 2,
                pb: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 1 },
                alignItems: { xs: 'stretch', sm: 'center' },
                flexWrap: 'wrap',
              }}
            >
              {/* Filters row */}
              <Box sx={{ display: 'flex', gap: 1, flex: 1, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, flex: { xs: 1, sm: 'none' } }}>
                  <InputLabel>{t('filters.month')}</InputLabel>
                  <Select value={filterBulan} label={t('filters.month')} onChange={(e) => setFilterBulan(e.target.value)}>
                    <MenuItem value="semua">{t('filters.allMonths')}</MenuItem>
                    {bulanOptions.map((bulanKey) => (
                      <MenuItem key={bulanKey} value={bulanKey}>{getBulanLabel(bulanKey)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { xs: 1, sm: 'none' } }}>
                  <InputLabel>{t('filters.type')}</InputLabel>
                  <Select value={filterJenis} label={t('filters.type')} onChange={(e) => setFilterJenis(e.target.value as typeof filterJenis)}>
                    <MenuItem value="semua">{t('filters.allTypes')}</MenuItem>
                    <MenuItem value="pendapatan">{t('common.income')}</MenuItem>
                    <MenuItem value="pengeluaran">{t('common.expense')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Actions row */}
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Button
                  id="btn-hpp-bep"
                  variant="outlined"
                  startIcon={<AccountBalanceIcon />}
                  onClick={() => setBepHppDialogOpen(true)}
                  sx={{ borderRadius: 8, whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                >
                  {t('buttons.hppBep')}
                </Button>
                <Button
                  id="btn-catat-transaksi"
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  onClick={openAddDialog}
                  sx={{ borderRadius: 8, whiteSpace: 'nowrap', flex: { xs: 1, sm: 'none' } }}
                >
                  {t('buttons.addTransaction')}
                </Button>
              </Box>
            </Box>

            <CardContent sx={{ pt: 0, flex: 1, px: 2, pb: 2 }}>
              <TableContainer sx={{ maxHeight: { xs: 500, lg: 700 }, overflow: 'auto' }}>
                <Table size="medium" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {[t('ledger.columns.date'), t('ledger.columns.category'), t('ledger.columns.note'), t('ledger.columns.type'), t('ledger.columns.value'), t('ledger.columns.action')].map((h) => (
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
                              {t('ledger.empty')}
                            </Typography>
                            <Button size="small" variant="outlined" onClick={openAddDialog} sx={{ mt: 1, borderRadius: 8 }}>
                              {t('ledger.addFirst')}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedTransactions.map((tx) => (
                        <TableRow key={tx._id} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.018)' } }}>
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
                              label={tx.jenis === 'pendapatan' ? t('common.income') : t('common.expense')}
                              size="small"
                              sx={{
                                backgroundColor: tx.jenis === 'pendapatan' ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.error.main, 0.15),
                                color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                                fontWeight: 800,
                                fontSize: '0.75rem',
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
                                onClick={() => handleDelete(tx._id)}
                                sx={{
                                  borderRadius: 2,
                                  color: 'error.main',
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
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
        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Kartu Ringkasan */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('summary.title')}
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
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  borderRadius: 3,
                  mb: 2,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{t('summary.totalIncome')}</Typography>
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
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  borderRadius: 3,
                  mb: 2,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDownIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{t('summary.totalExpense')}</Typography>
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
                  bgcolor: labaBersih >= 0 ? alpha(theme.palette.success.main, 0.07) : alpha(theme.palette.error.main, 0.07),
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: labaBersih >= 0 ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.2),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {labaBersih >= 0 ? t('summary.netProfit') : t('summary.deficit')}
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
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                  {t('distribution.title')}
                </Typography>
              }
            />
            <CardContent sx={{ pt: 0, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                  {editingId ? t('transactionDialog.editTitle') : t('transactionDialog.addTitle')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {editingId ? t('transactionDialog.editSubtitle') : t('transactionDialog.addSubtitle')}
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
                      <InputLabel>{t('transactionDialog.fields.type')}</InputLabel>
                      <Select {...field} label={t('transactionDialog.fields.type')}>
                        <MenuItem value="pendapatan">{t('transactionDialog.options.income')}</MenuItem>
                        <MenuItem value="pengeluaran">{t('transactionDialog.options.expense')}</MenuItem>
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
                      label={t('transactionDialog.fields.date')}
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
                  <InputLabel>{t('transactionDialog.fields.category')}</InputLabel>
                  <Select {...field} label={t('transactionDialog.fields.category')}>
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
                  label={t('transactionDialog.fields.amount')}
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
                  label={t('transactionDialog.fields.noteOptional')}
                  multiline
                  rows={2}
                  fullWidth
                  placeholder={
                    selectedJenis === 'pengeluaran'
                      ? t('transactionDialog.placeholders.expense')
                      : t('transactionDialog.placeholders.income')
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
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{
                  flex: 2,
                  borderRadius: 8,
                  bgcolor: 'success.main',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                {editingId ? t('transactionDialog.update') : t('transactionDialog.save')}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Kalkulator HPP & BEP ─── */}
      <Dialog
        open={bepHppDialogOpen}
        onClose={() => setBepHppDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}>
                {t('hppDialog.title')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('hppDialog.subtitle')}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setBepHppDialogOpen(false)} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: '12px !important' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('hppDialog.fields.fixedCost')}
                type="number"
                value={biayaTetapDisplayValue}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('biayaTetap', e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    startAdornment: biayaTetapDisplayValue
                      ? (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                        </InputAdornment>
                      )
                      : undefined,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('hppDialog.fields.totalProduction')}
                type="number"
                value={getBepHppInputDisplayValue(bepHppInputs.jumlahProduksi)}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('jumlahProduksi', e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>kg</Typography>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={t('hppDialog.fields.unitPrice')}
                type="number"
                value={hargaJualDisplayValue}
                placeholder="0"
                onChange={(e) => handleBepHppInputChange('hargaJualPerUnit', e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    inputProps: { min: 0 },
                    startAdornment: hargaJualDisplayValue
                      ? (
                        <InputAdornment position="start">
                          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>Rp</Typography>
                        </InputAdornment>
                      )
                      : undefined,
                  },
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              HPP = Total Biaya Produksi / Jumlah Produksi
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              BEP Unit = Biaya Tetap / (Harga Jual per Unit - Biaya Variabel per Unit)
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              BEP Rupiah = Biaya Tetap / (1 - Biaya Variabel / Penjualan)
            </Typography>
          </Box>

          <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.variableCostTotal')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatRupiah(biayaVariabelTotal)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.variableCostPerUnit')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {jumlahProduksi > 0 ? formatRupiah(biayaVariabelPerUnit) : t('hppDialog.results.inputProduction')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfdf3', border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.hppPerUnit')}</Typography>
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 800 }}>
                {jumlahProduksi > 0 ? formatRupiah(hppPerUnit) : t('hppDialog.results.inputProduction')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #bae6fd' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.bepUnit')}</Typography>
              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 800 }}>
                {bepUnit !== null ? `${formatAngka(bepUnit)} kg` : t('hppDialog.results.notCalculatable')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('hppDialog.results.bepValue')}</Typography>
              <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 800 }}>
                {bepRupiah !== null ? formatRupiah(bepRupiah) : t('hppDialog.results.notCalculatable')}
              </Typography>
            </Box>
          </Box>

          {marginKontribusiPerUnit <= 0 && jumlahProduksi > 0 && (
            <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'error.main' }}>
              {t('hppDialog.results.invalidBepUnit')}
            </Typography>
          )}
          {(marginKontribusiRasio === null || marginKontribusiRasio <= 0) && (
            <Typography variant="caption" sx={{ mt: 0.8, display: 'block', color: 'error.main' }}>
              {t('hppDialog.results.invalidBepValue')}
            </Typography>
          )}

          <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={() => setBepHppDialogOpen(false)} sx={{ borderRadius: 8 }}>
              {t('hppDialog.close')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Laporan Keuangan PDF ─── */}
      <Dialog
        open={aiDialogOpen}
        onClose={() => { if (!reportLoading) setAiDialogOpen(false); }}
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
                  {t('reportDialog.title')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('reportDialog.period')}: {filterBulan === 'semua' ? t('filters.allMonths') : getPeriodeLabel(filterBulan)}
                </Typography>
              </Box>
            </Box>
            {!reportLoading && (
              <IconButton size="small" onClick={() => setAiDialogOpen(false)} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {reportLoading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress color="success" />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                {t('reportDialog.loading')}
              </Typography>
            </Box>
          )}

          {reportError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setReportError(null)}>
              {reportError}
            </Alert>
          )}

          {/* Ringkasan data */}
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('reportDialog.summary.title')}
            </Typography>
            <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('summary.totalIncome')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>{formatRupiah(totalPendapatan)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('summary.totalExpense')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>{formatRupiah(totalPengeluaran)}</Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="caption" color="text.secondary">{labaBersih >= 0 ? t('summary.netProfit') : t('summary.deficit')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: labaBersih >= 0 ? 'success.main' : 'error.main' }}>
                  {formatRupiah(Math.abs(labaBersih))}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="caption" color="text.secondary">{t('reportDialog.summary.transactionCount')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{monthFilteredTransactions.length} {t('reportDialog.summary.transactions')}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Opsi 1: Manual PDF */}
          <Box
            sx={{
              p: 2.5,
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: 3,
              mb: 2,
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <DownloadIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('reportDialog.manual.title')}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('reportDialog.manual.desc')}
            </Typography>
            <Button
              variant="outlined"
              color="success"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleGeneratePdfManual}
              disabled={reportLoading || monthFilteredTransactions.length === 0}
              sx={{ borderRadius: 8 }}
            >
              {t('reportDialog.manual.button')}
            </Button>
          </Box>

          {/* Opsi 2: AI PDF */}
          <Box
            sx={{
              p: 2.5,
              border: '2px solid',
              borderColor: aiQuotaRemaining > 0 ? 'primary.light' : 'divider',
              borderRadius: 3,
              bgcolor: aiQuotaRemaining > 0 ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.text.primary, 0.03),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AutoFixHighIcon sx={{ color: aiQuotaRemaining > 0 ? 'primary.dark' : 'text.disabled' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: aiQuotaRemaining > 0 ? 'text.primary' : 'text.disabled' }}>
                  {t('reportDialog.ai.title')}
                </Typography>
              </Box>
              <Chip
                label={`${aiQuotaRemaining}/${MAX_AI_REPORTS_PER_MONTH} ${t('reportDialog.ai.quotaRemaining')}`}
                size="small"
                sx={{
                  bgcolor: aiQuotaRemaining > 0 ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.error.main, 0.15),
                  color: aiQuotaRemaining > 0 ? 'success.main' : 'error.main',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {aiQuotaRemaining > 0
                ? t('reportDialog.ai.descActive')
                : t('reportDialog.ai.descEmpty')}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              startIcon={<AutoFixHighIcon />}
              onClick={handleGeneratePdfAI}
              disabled={reportLoading || aiQuotaRemaining <= 0 || monthFilteredTransactions.length === 0}
              sx={{ borderRadius: 8, bgcolor: 'text.primary', color: 'background.default', '&:hover': { bgcolor: 'text.secondary' } }}
            >
              {t('reportDialog.ai.button')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    {/* Confirm Delete Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          Hapus Transaksi?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tindakan ini tidak dapat dibatalkan. Transaksi akan dihapus secara permanen.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteConfirmId(null)}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Ya, Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: '84px', md: 0 } }}
      >
        <Alert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
}
