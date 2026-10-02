'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { trackPageView } from '@/lib/analytics/trackPageView';
import { useStok, computeExpiryDate } from '@/hooks/useStok';
import { useTransactions } from '@/hooks/useTransactions';
import { useSupplyItems } from '@/hooks/useSupplyItems';
import { isValidDateInputValue, normalizeDateInputValue } from '@/lib/formatters';
import {
  batchSchema,
  stockOutSchema,
  type BatchFormInput,
  type BatchFormOutput,
  type StockOutFormInput,
  type StockOutFormOutput,
} from '@/lib/validators/stockSchemas';

export function useStokController() {
  const t = useTranslations('Stock');

  useEffect(() => {
    void trackPageView('stok');
  }, []);

  const {
    batches, mutations, summary, loading, buyers,
    grades, locations,
    addBatch, closeBatch, stockOut, refreshMutations,
    addGrade, renameGrade, removeGrade,
    addLocation, renameLocation, removeLocation,
  } = useStok();
  const { addTransaction } = useTransactions();
  const {
    items: supplyItems,
    loading: supplyLoading,
    addItem: addSupplyItem,
    addMutation: addSupplyMutation,
  } = useSupplyItems();

  const [tab, setTab] = useState(0);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [stockOutDialogOpen, setStockOutDialogOpen] = useState(false);
  const [mutFilter, setMutFilter] = useState('semua');
  const [mutFromDate, setMutFromDate] = useState('');
  const [mutToDate, setMutToDate] = useState('');
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [gradeDeleteError, setGradeDeleteError] = useState<string | null>(null);
  const [locationDeleteError, setLocationDeleteError] = useState<string | null>(null);

  const batchForm = useForm<BatchFormInput, unknown, BatchFormOutput>({
    resolver: zodResolver(batchSchema.extend({
      tanggalPanen: z
        .string()
        .min(1, t('dialogs.validation.required'))
        .refine((value) => !value || isValidDateInputValue(value), 'Format tanggal harus dd-MM-yyyy'),
      beratMasuk: z.coerce.number().min(0.1, t('dialogs.validation.minWeight')),
      hargaModal: z.coerce.number().min(1, t('dialogs.validation.required')),
      hargaJual: z.coerce.number().min(1, t('dialogs.validation.required')),
      estimasiKadaluarsa: z
        .string()
        .min(1, t('dialogs.validation.required'))
        .refine((value) => !value || isValidDateInputValue(value), 'Format tanggal harus dd-MM-yyyy'),
    })),
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
    resolver: zodResolver(stockOutSchema.extend({
      batchId: z.string().min(1, t('dialogs.validation.selectBatch')),
      berat: z.coerce.number().min(0.1, t('dialogs.validation.minWeight')),
      tanggal: z
        .string()
        .min(1, t('dialogs.validation.required'))
        .refine((value) => !value || isValidDateInputValue(value), 'Format tanggal harus dd-MM-yyyy'),
    })),
    defaultValues: {
      batchId: '',
      berat: 0,
      tujuan: 'Pasar Lokal',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: '',
    },
  });

  // ── Auto-fill estimasiKadaluarsa = tanggalPanen + 14 hari ───────
  const watchedTanggalPanen = useWatch({ control: batchForm.control, name: 'tanggalPanen' });
  useEffect(() => {
    if (!watchedTanggalPanen) return;
    const normalizedTanggalPanen = normalizeDateInputValue(watchedTanggalPanen);
    if (!isValidDateInputValue(normalizedTanggalPanen)) return;
    const current = batchForm.getValues('estimasiKadaluarsa');
    if (!current) {
      batchForm.setValue('estimasiKadaluarsa', computeExpiryDate(normalizedTanggalPanen));
    }
  }, [watchedTanggalPanen, batchForm]);

  // ── Auto-fill hargaRealisasi + validasi berat real-time ─────────
  const watchedBatchId = useWatch({ control: stockOutForm.control, name: 'batchId' });
  const watchedBerat = useWatch({ control: stockOutForm.control, name: 'berat' });
  const watchedHargaRealisasi = useWatch({ control: stockOutForm.control, name: 'hargaRealisasi' });

  useEffect(() => {
    if (!watchedBatchId) return;
    const batch = batches.find((b) => b._id === watchedBatchId);
    if (!batch) return;
    const currentHarga = stockOutForm.getValues('hargaRealisasi');
    if (!currentHarga) {
      stockOutForm.setValue('hargaRealisasi', batch.hargaJual);
    }
  }, [watchedBatchId, batches, stockOutForm]);

  useEffect(() => {
    const beratNum = Number(watchedBerat) || 0;
    if (!watchedBatchId || !beratNum) return;
    const batch = batches.find((b) => b._id === watchedBatchId);
    if (!batch) return;
    if (beratNum > batch.stokTersisa) {
      stockOutForm.setError('berat', {
        type: 'manual',
        message: `Melebihi stok tersisa (${batch.stokTersisa} kg). Maksimal ${batch.stokTersisa} kg.`,
      });
    } else {
      stockOutForm.clearErrors('berat');
    }
  }, [watchedBerat, watchedBatchId, batches, stockOutForm]);

  // ── Computed props untuk StokView ────────────────────────────────
  const stockOutSelectedBatch = batches.find((b) => b._id === watchedBatchId) ?? null;

  const watchedBeratMasuk = useWatch({ control: batchForm.control, name: 'beratMasuk' });
  const watchedHargaJual = useWatch({ control: batchForm.control, name: 'hargaJual' });
  const beratMasukNum = Number(watchedBeratMasuk) || 0;
  const hargaJualNum = Number(watchedHargaJual) || 0;
  const batchEstimatedValue =
    beratMasukNum > 0 && hargaJualNum > 0 ? beratMasukNum * hargaJualNum : 0;

  const beratNum = Number(watchedBerat) || 0;
  const hargaRealisasiNum = Number(watchedHargaRealisasi) || 0;
  const stockOutTotal =
    beratNum > 0 && hargaRealisasiNum > 0 ? beratNum * hargaRealisasiNum : 0;

  const stockOutHargaDiff: number | null =
    stockOutSelectedBatch && hargaRealisasiNum > 0
      ? hargaRealisasiNum - stockOutSelectedBatch.hargaJual
      : null;

  const handleRemoveGrade = async (id: string) => {
    try {
      setGradeDeleteError(null);
      await removeGrade(id);
    } catch (err: unknown) {
      setGradeDeleteError(err instanceof Error ? err.message : 'Gagal menghapus grade');
    }
  };

  const handleRemoveLocation = async (id: string) => {
    try {
      setLocationDeleteError(null);
      await removeLocation(id);
    } catch (err: unknown) {
      setLocationDeleteError(err instanceof Error ? err.message : 'Gagal menghapus lokasi');
    }
  };

  const openAddBatch = () => {
    batchForm.reset({
      tanggalPanen: new Date().toISOString().split('T')[0],
      grade: grades[0]?.nama ?? 'A',
      lokasiPenyimpanan: locations[0]?.nama ?? 'Gudang Utama',
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
      tanggalPanen: normalizeDateInputValue(data.tanggalPanen),
      estimasiKadaluarsa: normalizeDateInputValue(data.estimasiKadaluarsa),
      catatan: data.catatan ?? '',
    });
    setBatchDialogOpen(false);
  };

  const onStockOutSubmit = async (data: StockOutFormOutput) => {
    const tanggal = normalizeDateInputValue(data.tanggal);
    await stockOut(data.batchId, {
      berat: data.berat,
      tujuan: data.tujuan,
      tanggal,
      catatan: data.catatan || '',
      namaPembeli: data.namaPembeli?.trim() || undefined,
      hargaRealisasi: data.hargaRealisasi || undefined,
    });

    // Auto-create income transaction when stock is sold with a realized price
    if (data.hargaRealisasi && data.hargaRealisasi > 0) {
      const batch = batches.find((b) => b._id === data.batchId);
      const nominal = data.berat * data.hargaRealisasi;
      await addTransaction({
        jenis: 'pendapatan',
        kategori: 'Penjualan Panen',
        nominal,
        tanggal,
        keterangan: `Penjualan ${data.berat} kg ${batch?.batchCode ?? ''} ke ${data.namaPembeli?.trim() || data.tujuan}`,
      });
    }

    setStockOutDialogOpen(false);
    stockOutForm.reset();
  };

  const handleCloseBatch = (id: string) => {
    setCloseConfirmId(id);
  };

  const handleConfirmClose = async () => {
    if (!closeConfirmId) return;
    await closeBatch(closeConfirmId);
    setCloseConfirmId(null);
  };

  const handleApplyDateFilter = () => {
    if (mutFromDate && !isValidDateInputValue(mutFromDate)) return;
    if (mutToDate && !isValidDateInputValue(mutToDate)) return;
    refreshMutations({
      grade: mutFilter !== 'semua' ? mutFilter : undefined,
      from: mutFromDate ? normalizeDateInputValue(mutFromDate) : undefined,
      to: mutToDate ? normalizeDateInputValue(mutToDate) : undefined,
    });
  };

  const handleResetDateFilter = () => {
    setMutFromDate('');
    setMutToDate('');
    refreshMutations({
      grade: mutFilter !== 'semua' ? mutFilter : undefined,
    });
  };

  const alertBatches = batches.filter((b) => b.status === 'hampir_kadaluarsa');
  const activeBatches = batches.filter((b) => b.status !== 'habis');
  const filteredMutations = mutFilter === 'semua'
    ? mutations
    : mutations.filter((m) => m.batchCode.includes(`-${mutFilter}`));
  const mutFromDateInvalid = mutFromDate ? !isValidDateInputValue(mutFromDate) : false;
  const mutToDateInvalid = mutToDate ? !isValidDateInputValue(mutToDate) : false;

  return {
    activeBatches,
    alertBatches,
    batchDialogOpen,
    batchForm,
    closeConfirmId,
    filteredMutations,
    loading,
    mutFilter,
    mutFromDate,
    mutFromDateInvalid,
    mutToDate,
    mutToDateInvalid,
    onBatchSubmit,
    onStockOutSubmit,
    openAddBatch,
    onCloseBatch: handleCloseBatch,
    onConfirmClose: handleConfirmClose,
    onCancelClose: () => setCloseConfirmId(null),
    onApplyDateFilter: handleApplyDateFilter,
    onResetDateFilter: handleResetDateFilter,
    setBatchDialogOpen,
    setMutFilter,
    setMutFromDate,
    setMutToDate,
    setStockOutDialogOpen,
    setTab,
    stockOutDialogOpen,
    stockOutForm,
    summary,
    tab,
    buyers,
    stockOutSelectedBatch,
    batchEstimatedValue,
    stockOutTotal,
    stockOutHargaDiff,
    grades,
    locations,
    gradeDialogOpen,
    locationDialogOpen,
    gradeDeleteError,
    locationDeleteError,
    setGradeDialogOpen,
    setLocationDialogOpen,
    onAddGrade: addGrade,
    onRenameGrade: renameGrade,
    onRemoveGrade: handleRemoveGrade,
    onAddLocation: addLocation,
    onRenameLocation: renameLocation,
    onRemoveLocation: handleRemoveLocation,
    onClearGradeDeleteError: () => setGradeDeleteError(null),
    onClearLocationDeleteError: () => setLocationDeleteError(null),
    supplyItems,
    supplyLoading,
    onAddSupplyItem: addSupplyItem,
    onAddSupplyMutation: addSupplyMutation,
  };
}
