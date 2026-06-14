'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '@mui/material/styles';
import { useCallback,useMemo,useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';


import { useAuth } from '@/context/AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';
import { aiApi } from '@/lib/api';
import { generatePdfReport,getPeriodeLabel } from '@/lib/pdfReport';
import { useTranslations } from 'next-intl';

import { useTransactions } from '@/hooks/useTransactions';
import type { ApiTransaction } from '@/lib/api';
import useMediaQuery from '@mui/material/useMediaQuery';
import { buildFinanceExpensePieData } from './financeCategoryChart';

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
  totalBiaya: number;
  proyeksiPanen: number;
  targetHargaJual: number;
  targetMargin: number; // persen, e.g. 25 = 25%
};



const MAX_AI_REPORTS_PER_MONTH = 3;

interface QuotaState {
  month: string; // format YYYY-MM
  used: number;
}

export function useKeuanganController() {

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
  
  const bepKey = `arina-bfa-inputs-${user?.id || 'guest'}`;
  const [bepHppInputs, setBepHppInputs] = useLocalStorage<BepHppInputs>(bepKey, {
    totalBiaya: 0,
    proyeksiPanen: 0,
    targetHargaJual: 0,
    targetMargin: 0,
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
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [filterBulan, setFilterBulan] = useState('semua');
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pengeluaran' | 'pendapatan'>('semua');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TransactionFormData>({
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

  const selectedJenis = useWatch({ control, name: 'jenis' });

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

    setTxSubmitting(true);
    try {
      if (editingId) {
        await updateTransaction(editingId, txData);
        setSnackbar({ open: true, message: 'Transaksi berhasil diperbarui', severity: 'success' });
      } else {
        await addTransaction(txData);
        setSnackbar({ open: true, message: 'Transaksi berhasil dicatat', severity: 'success' });
      }
      setTxDialogOpen(false);
      setEditingId(null);
    } catch {
      setSnackbar({ open: true, message: 'Gagal menyimpan transaksi', severity: 'error' });
    } finally {
      setTxSubmitting(false);
    }
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
    const raw = Number(rawValue) || 0;
    // Only margin allows negative; all others floored at 0
    const numericValue = field === 'targetMargin' ? raw : Math.max(0, raw);

    setBepHppInputs((prev) => {
      const next = { ...prev, [field]: numericValue };
      const hpp = next.proyeksiPanen > 0 ? next.totalBiaya / next.proyeksiPanen : null;

      if (hpp !== null && hpp > 0) {
        if (field === 'targetHargaJual') {
          // Harga jual berubah → hitung markup (keuntungan dari modal)
          next.targetMargin = numericValue > 0
            ? parseFloat(((numericValue / hpp - 1) * 100).toFixed(10))
            : 0;
        } else if (field === 'targetMargin') {
          // Markup berubah → hitung harga jual: HPP × (1 + markup/100)
          next.targetHargaJual = numericValue > -100
            ? Math.round(hpp * (1 + numericValue / 100))
            : 0;
        } else {
          // totalBiaya atau proyeksiPanen berubah → HPP berubah, sync markup dari hargaJual yang ada
          if (next.targetHargaJual > 0) {
            next.targetMargin = parseFloat(((next.targetHargaJual / hpp - 1) * 100).toFixed(10));
          }
        }
      }

      return next;
    });
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

  const monthFilteredTransactions = transactions.filter((tx) =>
    filterBulan === 'semua' || tx.tanggal.startsWith(filterBulan)
  );

  // Summaries
  let totalPendapatan = 0;
  let totalPengeluaran = 0;
  for (const tx of monthFilteredTransactions) {
    if (tx.jenis === 'pendapatan') {
      totalPendapatan += tx.nominal;
    } else if (tx.jenis === 'pengeluaran') {
      totalPengeluaran += tx.nominal;
    }
  }
  const labaBersih = totalPendapatan - totalPengeluaran;

  // BFA (Business Feasibility Analysis) — standalone planning tool, tidak terkait data transaksi
  const { totalBiaya, proyeksiPanen, targetHargaJual } = bepHppInputs;

  const bfaHpp = proyeksiPanen > 0 ? totalBiaya / proyeksiPanen : null;
  const bfaBepKg = targetHargaJual > 0 ? totalBiaya / targetHargaJual : null;
  const bfaBepRupiah =
    bfaHpp !== null && targetHargaJual > 0 && targetHargaJual !== bfaHpp
      ? totalBiaya / (1 - bfaHpp / targetHargaJual)
      : null;
  const bfaProyeksiLaba =
    proyeksiPanen > 0 && targetHargaJual > 0
      ? proyeksiPanen * targetHargaJual - totalBiaya
      : null;
  const bfaLayak = bfaBepKg !== null && proyeksiPanen > bfaBepKg;

  // Pie chart data
  const expenseCategoryDefinitions = useMemo(
    () => [
      {
        id: 'pesticide',
        jenis: 'pengeluaran' as const,
        label: t('categories.pesticide'),
        aliases: [t('categories.pesticide'), 'Pestisida', 'Pesticide', 'obat tanaman'],
        color: theme.palette.error.main,
      },
      {
        id: 'fertilizer',
        jenis: 'pengeluaran' as const,
        label: t('categories.fertilizer'),
        aliases: [t('categories.fertilizer'), 'Pupuk', 'Fertilizer', 'npk', 'urea', 'pembelian pupuk'],
        color: theme.palette.success.main,
      },
      {
        id: 'labor',
        jenis: 'pengeluaran' as const,
        label: t('categories.labor'),
        aliases: [t('categories.labor'), 'Tenaga Kerja', 'Labor', 'gaji', 'upah'],
        color: theme.palette.info.main,
      },
      {
        id: 'irrigation',
        jenis: 'pengeluaran' as const,
        label: t('categories.irrigation'),
        aliases: [t('categories.irrigation'), 'Irigasi & Air', 'Irrigation & Water', 'air', 'pompa air'],
        color: theme.palette.primary.main,
      },
      {
        id: 'tools',
        jenis: 'pengeluaran' as const,
        label: t('categories.tools'),
        aliases: [t('categories.tools'), 'Alat Tani', 'Farm Tools', 'alat', 'peralatan'],
        color: theme.palette.warning.main,
      },
      {
        id: 'other',
        jenis: 'pengeluaran' as const,
        label: t('categories.other'),
        aliases: [t('categories.other'), 'Lainnya', 'Other'],
        color: theme.palette.text.secondary,
      },
    ],
    [t, theme]
  );

  const expensePie = useMemo(
    () =>
      buildFinanceExpensePieData({
        transactions: monthFilteredTransactions,
        categories: expenseCategoryDefinitions,
        customColors: [
          theme.palette.secondary.main,
          theme.palette.success.dark,
          theme.palette.info.dark,
          theme.palette.warning.dark,
          theme.palette.error.dark,
        ],
        emptyLabel: t('distribution.empty'),
      }),
    [expenseCategoryDefinitions, monthFilteredTransactions, t, theme]
  );

  const finalPieData = expensePie.data;
  const finalPieColors = expensePie.colors;

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

  return {
    t,
    bepHppInputs,
    aiDialogOpen,
    setAiDialogOpen,
    reportLoading,
    reportError,
    setReportError,
    bepHppDialogOpen,
    setBepHppDialogOpen,
    txDialogOpen,
    setTxDialogOpen,
    editingId,
    setEditingId,
    deleteConfirmId,
    setDeleteConfirmId,
    snackbar,
    setSnackbar,
    filterBulan,
    setFilterBulan,
    filterJenis,
    setFilterJenis,
    theme,
    isMobile,
    control,
    handleSubmit,
    errors,
    selectedJenis,
    kategoriFiltered,
    openAddDialog,
    handleEdit,
    onSubmit,
    txSubmitting,
    handleDelete,
    handleConfirmDelete,
    handleNominalChange,
    handleBepHppInputChange,
    getBepHppInputDisplayValue,
    handleExportExcel,
    aiQuotaRemaining,
    handleGeneratePdfManual,
    handleGeneratePdfAI,
    monthFilteredTransactions,
    totalPendapatan,
    totalPengeluaran,
    labaBersih,
    bfaHpp,
    bfaBepKg,
    bfaBepRupiah,
    bfaProyeksiLaba,
    bfaLayak,
    finalPieData,
    finalPieColors,
    bulanOptions,
    getBulanLabel,
    displayedTransactions,
  };
}

export type UseKeuanganControllerResult = ReturnType<typeof useKeuanganController>;
