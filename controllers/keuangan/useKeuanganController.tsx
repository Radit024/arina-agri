'use client';

import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useTranslations } from 'next-intl';
import { trackPageView } from '@/lib/analytics/trackPageView';

import { useTransactionsForScenario } from '@/hooks/useTransactionsForScenario';
import useMediaQuery from '@mui/material/useMediaQuery';
import { buildFinanceExpensePieData } from './financeCategoryChart';
import { nextLedgerSortState } from './ledgerSort';
import { getModeLabel, getModeSlug } from '@/lib/finance/scenarioLabels';
import { useFinanceExportController } from './useFinanceExportController';
import { useFinanceProjectController } from './useFinanceProjectController';
import { useFinanceReportController } from './useFinanceReportController';
import { useFinanceScenarioController } from './useFinanceScenarioController';
import { useFinancingController } from './useFinancingController';
import { useComparisonController } from './useComparisonController';
import { useLabaRugiActionsController } from './useLabaRugiActionsController';
import { useRabController } from './useRabController';
import { useRabTransactionLinkController } from './useRabTransactionLinkController';
import { useTransactionBatchController } from './useTransactionBatchController';
import { useTransactionMasterController } from './useTransactionMasterController';
import { useMigrationController } from './useMigrationController';
import { useProductionSalesController } from './useProductionSalesController';
import { generatePdfReport } from '@/lib/pdfReport';

type BepHppInputs = {
  totalBiaya: number;
  proyeksiPanen: number;
  targetHargaJual: number;
  targetMargin: number; // persen, e.g. 25 = 25%
};



const MAX_AI_REPORTS_PER_MONTH = 3;
const LEDGER_PAGE_SIZE = 7;

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

  useEffect(() => {
    void trackPageView('keuangan');
  }, []);

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [filterBulan, setFilterBulan] = useState('semua');
  const [filterJenis, setFilterJenis] = useState<'semua' | 'pengeluaran' | 'pendapatan'>('semua');
  const [filterRabLink, setFilterRabLink] = useState<'semua' | 'linked' | 'unlinked'>('semua');
  const [financeTab, setFinanceTab] = useState<'buku-besar' | 'rab' | 'laba-rugi' | 'arus-kas' | 'arus-kas-pasca-pembiayaan' | 'perbandingan'>('buku-besar');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'tanggal' | 'kategori' | 'nominal' | 'jenis' | null>('tanggal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const financeProject = useFinanceProjectController();
  const financeScenario = useFinanceScenarioController(financeProject.selectedProject?.id);
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reload: reloadTransactions,
  } = useTransactionsForScenario(financeScenario.activeScenario?.id ?? null);
  const migration = useMigrationController({
    projectId: financeProject.selectedProject?.id ?? null,
    onSuccess: () => {
      void reloadTransactions();
    },
  });
  const rab = useRabController(financeProject.selectedProject, addTransaction, financeScenario.activeScenario);
  const transactionBatch = useTransactionBatchController(rab.items, addTransaction, updateTransaction);
  const transactionMaster = useTransactionMasterController();
  const clearSelectionTxs = () => setSelectedTxIds([]);
  const rabTransactionLink = useRabTransactionLinkController({
    rabItems: rab.items,
    transactions,
    updateTransaction,
  });
  const productionSales = useProductionSalesController({
    scenarioId: financeScenario.activeScenario?.id ?? null,
  });
  const financeReports = useFinanceReportController({
    project: financeProject.selectedProject,
    rabItems: rab.items,
    transactions,
    productionSalesAssumptions: productionSales.assumptions,
  });
  const financing = useFinancingController({
    scenarioId: financeScenario.activeScenario?.id ?? null,
    arusKasBulanan: financeReports.arusKasBulanan,
  });
  const financeComparison = useComparisonController({
    scenarios: financeScenario.scenarios,
    project: financeProject.selectedProject,
    active: financeTab === 'perbandingan',
  });
  const labaRugiActions = useLabaRugiActionsController();
  const activeMode = financeScenario.activeMode;
  const modeLabel = getModeLabel(activeMode);
  const modeSlug = getModeSlug(activeMode);
  const hasSelectedProject = Boolean(financeProject.selectedProject);
  const hasProjectData = hasSelectedProject && (transactions.length > 0 || rab.items.length > 0);
  const financeAccess = {
    hasSelectedProject,
    hasProjectData,
    canInputFinance: hasSelectedProject,
    canExportFinance: hasSelectedProject,
  };
  const financeExport = useFinanceExportController({
    project: financeProject.selectedProject,
    rabItems: rab.items,
    transactions: financeReports.reportTransactions,
    startMonth: financeReports.reportStartMonth,
    endMonth: financeReports.reportEndMonth,
    canExport: financeAccess.canExportFinance,
    hasProjectData: financeAccess.hasProjectData,
    modeLabel,
    modeSlug,
  });
  const reportPeriodeLabel = financeReports.reportStartMonth === financeReports.reportEndMonth
    ? financeReports.reportStartMonth
    : `${financeReports.reportStartMonth} s.d. ${financeReports.reportEndMonth}`;
  const reportPeriodKey = financeReports.reportStartMonth === financeReports.reportEndMonth
    ? financeReports.reportStartMonth
    : `${financeReports.reportStartMonth}_sd_${financeReports.reportEndMonth}`;
  const reportTotals = useMemo(() => {
    let reportTotalPendapatan = 0;
    let reportTotalPengeluaran = 0;

    financeReports.reportTransactions.forEach((transaction) => {
      if (transaction.jenis === 'pendapatan') {
        reportTotalPendapatan += transaction.nominal;
      } else if (transaction.jenis === 'pengeluaran') {
        reportTotalPengeluaran += transaction.nominal;
      }
    });

    return {
      totalPendapatan: reportTotalPendapatan,
      totalPengeluaran: reportTotalPengeluaran,
      labaBersih: reportTotalPendapatan - reportTotalPengeluaran,
    };
  }, [financeReports.reportTransactions]);
  const guardedTransactionBatch = {
    ...transactionBatch,
    openForCreate: () => {
      if (!financeAccess.canInputFinance) {
        setSnackbar({
          open: true,
          message: 'Buat atau pilih proyek terlebih dahulu',
          severity: 'error',
        });
        return;
      }
      transactionBatch.openForCreate();
    },
  };
  const guardedRabTransactionLink = {
    ...rabTransactionLink,
    openForTransactions: (ids: string[]) => {
      if (!financeAccess.canInputFinance) {
        setSnackbar({
          open: true,
          message: 'Buat atau pilih proyek terlebih dahulu',
          severity: 'error',
        });
        return;
      }
      rabTransactionLink.openForTransactions(ids);
    },
    linkToRabItem: async (item: Parameters<typeof rabTransactionLink.linkToRabItem>[0]) => {
      const results = await rabTransactionLink.linkToRabItem(item);
      if (results.failed === 0 && results.success > 0) {
        clearSelectionTxs();
        setSnackbar({
          open: true,
          message: `${results.success} transaksi berhasil dihubungkan ke RAB`,
          severity: 'success',
        });
      } else if (results.failed > 0) {
        setSnackbar({
          open: true,
          message: `${results.failed} transaksi gagal dihubungkan ke RAB`,
          severity: 'error',
        });
      }
      return results;
    },
  };

  useEffect(() => {
    const results = transactionBatch.submitResults;
    if (!results) return;
    if (results.failed === 0) {
      setSnackbar({ open: true, message: `${results.success} transaksi berhasil disimpan`, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: `${results.success} berhasil, ${results.failed} gagal`, severity: 'error' });
    }
  }, [transactionBatch.submitResults]);

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteTransaction(deleteConfirmId);
    setDeleteConfirmId(null);
    setSnackbar({ open: true, message: 'Transaksi berhasil dihapus', severity: 'success' });
  };

  const toggleSort = (col: NonNullable<typeof sortColumn>) => {
    const next = nextLedgerSortState({ column: sortColumn, dir: sortDir }, col);
    setSortColumn(next.column);
    setSortDir(next.dir);
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteConfirm = async () => {
    const count = selectedTxIds.length;
    for (const id of selectedTxIds) {
      await deleteTransaction(id);
    }
    clearSelectionTxs();
    setBulkDeleteConfirm(false);
    setSnackbar({ open: true, message: `${count} transaksi berhasil dihapus`, severity: 'success' });
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

  // ─── AI Quota helpers ──────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const quotaThisMonth = aiReportQuota.month === currentMonth ? aiReportQuota.used : 0;
  const aiQuotaRemaining = MAX_AI_REPORTS_PER_MONTH - quotaThisMonth;

  const consumeAiQuota = () => {
    setAiReportQuota({ month: currentMonth, used: quotaThisMonth + 1 });
  };

  const getFinanceExportBlockedMessage = () => {
    if (!financeAccess.hasSelectedProject) return 'Buat atau pilih proyek terlebih dahulu';
    return null;
  };

  const handleOpenFinanceReportDialog = () => {
    const blockedMessage = getFinanceExportBlockedMessage();
    if (blockedMessage) {
      setReportError(blockedMessage);
      return;
    }
    setAiDialogOpen(true);
  };

  // ─── Generate PDF (manual, tanpa AI) ─────────────────────────────────────────
  const handleGeneratePdfManual = async () => {
    const blockedMessage = getFinanceExportBlockedMessage();
    if (blockedMessage) {
      setReportError(blockedMessage);
      return;
    }
    setReportLoading(true);
    setReportError(null);
    try {
      await generatePdfReport({
        periode: reportPeriodKey,
        periodeLabel: reportPeriodeLabel,
        totalPendapatan: reportTotals.totalPendapatan,
        totalPengeluaran: reportTotals.totalPengeluaran,
        labaBersih: reportTotals.labaBersih,
        project: financeProject.selectedProject,
        rabItems: rab.items,
        transactions: financeReports.reportTransactions,
        userName: user?.email ?? undefined,
        modeLabel,
        modeSlug,
      });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Gagal membuat laporan PDF');
    } finally {
      setReportLoading(false);
    }
  };

  // ─── Generate PDF (dengan AI Saran) ───────────────────────────────────────────
  const handleGeneratePdfAI = async () => {
    if (aiQuotaRemaining <= 0) {
      setReportError(`Kuota laporan AI bulan ini sudah habis (${MAX_AI_REPORTS_PER_MONTH} laporan/bulan).`);
      return;
    }
    const blockedMessage = getFinanceExportBlockedMessage();
    if (blockedMessage) {
      setReportError(blockedMessage);
      return;
    }
    setReportLoading(true);
    setReportError(null);
    try {
      const payload = {
        periode: reportPeriodKey,
        totalPendapatan: reportTotals.totalPendapatan,
        totalPengeluaran: reportTotals.totalPengeluaran,
        labaBersih: reportTotals.labaBersih,
        transactions: financeReports.reportTransactions,
        userName: user?.email ?? undefined,
      };
      const response = await fetch('/api/ai/financial-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { success: boolean; message?: string; data?: { analysis: string } };
      if (!result.success || !result.data?.analysis) {
        throw new Error(result.message ?? 'Gagal mendapatkan analisis AI');
      }
      consumeAiQuota();
      await generatePdfReport({
        periode: reportPeriodKey,
        periodeLabel: reportPeriodeLabel,
        totalPendapatan: reportTotals.totalPendapatan,
        totalPengeluaran: reportTotals.totalPengeluaran,
        labaBersih: reportTotals.labaBersih,
        project: financeProject.selectedProject,
        rabItems: rab.items,
        transactions: financeReports.reportTransactions,
        userName: user?.email ?? undefined,
        aiAnalysis: result.data.analysis,
        modeLabel,
        modeSlug,
      });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Gagal membuat laporan PDF+AI');
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

  useEffect(() => {
    if (filterBulan !== 'semua' && !bulanOptions.includes(filterBulan)) {
      setFilterBulan('semua');
    }
  }, [bulanOptions, filterBulan, setFilterBulan]);

  // Filtered + searched + sorted table data
  const displayedTransactions = useMemo(() => {
    let result = monthFilteredTransactions.filter(
      (tx) => filterJenis === 'semua' || tx.jenis === filterJenis
    );

    if (filterRabLink === 'linked') {
      result = result.filter((tx) => Boolean(tx.rabItemId || tx.rabCategoryId));
    } else if (filterRabLink === 'unlinked') {
      result = result.filter((tx) => !tx.rabItemId && !tx.rabCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (tx) =>
          tx.kategori.toLowerCase().includes(q) ||
          String(tx.volume ?? '').includes(q) ||
          (tx.satuan ?? '').toLowerCase().includes(q) ||
          String(tx.hargaSatuan ?? '').includes(q) ||
          String(tx.nominal ?? '').includes(q) ||
          (tx.keterangan ?? '').toLowerCase().includes(q)
      );
    }

    if (!sortColumn || !sortDir) return result;

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'tanggal') cmp = a.tanggal.localeCompare(b.tanggal);
      else if (sortColumn === 'kategori') cmp = a.kategori.localeCompare(b.kategori);
      else if (sortColumn === 'nominal') cmp = a.nominal - b.nominal;
      else if (sortColumn === 'jenis') cmp = a.jenis.localeCompare(b.jenis);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [monthFilteredTransactions, filterJenis, filterRabLink, searchQuery, sortColumn, sortDir]);

  const ledgerTotalPages = Math.max(1, Math.ceil(displayedTransactions.length / LEDGER_PAGE_SIZE));

  useEffect(() => {
    setLedgerPage(1);
  }, [filterBulan, filterJenis, filterRabLink, searchQuery, sortColumn, sortDir]);

  useEffect(() => {
    if (ledgerPage > ledgerTotalPages) setLedgerPage(ledgerTotalPages);
  }, [ledgerPage, ledgerTotalPages]);

  const pagedTransactions = useMemo(
    () => displayedTransactions.slice((ledgerPage - 1) * LEDGER_PAGE_SIZE, ledgerPage * LEDGER_PAGE_SIZE),
    [displayedTransactions, ledgerPage],
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
    deleteConfirmId,
    setDeleteConfirmId,
    snackbar,
    setSnackbar,
    filterBulan,
    setFilterBulan,
    filterJenis,
    setFilterJenis,
    filterRabLink,
    setFilterRabLink,
    financeTab,
    setFinanceTab,
    theme,
    isMobile,
    handleDelete,
    handleConfirmDelete,
    handleBepHppInputChange,
    getBepHppInputDisplayValue,
    aiQuotaRemaining,
    handleOpenFinanceReportDialog,
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
    pagedTransactions,
    ledgerPage,
    setLedgerPage,
    ledgerTotalPages,
    financeAccess,
    financeProject,
    financeScenario,
    rab,
    rabTransactionLink: guardedRabTransactionLink,
    financeReports,
    financing,
    financeComparison,
    productionSales,
    labaRugiActions,
    financeExport,
    transactionBatch: guardedTransactionBatch,
    transactionMaster,
    migration,
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDir,
    toggleSort,
    selectedTxIds,
    toggleSelectTx,
    clearSelectionTxs,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDeleteConfirm,
  };
}

export type UseKeuanganControllerResult = ReturnType<typeof useKeuanganController>;
