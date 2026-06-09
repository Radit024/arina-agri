'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useStok, computeExpiryDate } from '@/hooks/useStok';
import { useWeatherRiskSignal } from '@/hooks/useWeatherRiskSignal';
import StokView from '@/app/dashboard/stok/_components/StokView';
import {
  batchSchema,
  stockOutSchema,
  type BatchFormInput,
  type BatchFormOutput,
  type StockOutFormInput,
  type StockOutFormOutput,
} from '@/app/dashboard/stok/_lib/stockSchemas';

export default function StokController() {
  const t = useTranslations('Stock');
  const {
    batches, mutations, summary, loading, backendOnline, buyers,
    grades, locations,
    addBatch, closeBatch, stockOut, refreshMutations,
    addGrade, renameGrade, removeGrade,
    addLocation, renameLocation, removeLocation,
  } = useStok();
  const { riskNote: weatherRiskNote } = useWeatherRiskSignal('stock');

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
      tanggalPanen: z.string().min(1, t('dialogs.validation.required')),
      beratMasuk: z.coerce.number().min(0.1, t('dialogs.validation.minWeight')),
      hargaModal: z.coerce.number().min(1, t('dialogs.validation.required')),
      hargaJual: z.coerce.number().min(1, t('dialogs.validation.required')),
      estimasiKadaluarsa: z.string().min(1, t('dialogs.validation.required')),
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
      tanggal: z.string().min(1, t('dialogs.validation.required')),
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
  const watchedTanggalPanen = batchForm.watch('tanggalPanen');
  useEffect(() => {
    if (!watchedTanggalPanen) return;
    const current = batchForm.getValues('estimasiKadaluarsa');
    if (!current) {
      batchForm.setValue('estimasiKadaluarsa', computeExpiryDate(watchedTanggalPanen));
    }
  }, [watchedTanggalPanen, batchForm]);

  // ── Auto-fill hargaRealisasi + validasi berat real-time ─────────
  const watchedBatchId = stockOutForm.watch('batchId');
  const watchedBerat = stockOutForm.watch('berat');
  const watchedHargaRealisasi = stockOutForm.watch('hargaRealisasi');

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

  const beratMasukNum = Number(batchForm.watch('beratMasuk')) || 0;
  const hargaJualNum = Number(batchForm.watch('hargaJual')) || 0;
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
    } catch (err: any) {
      setGradeDeleteError(err.message ?? 'Gagal menghapus grade');
    }
  };

  const handleRemoveLocation = async (id: string) => {
    try {
      setLocationDeleteError(null);
      await removeLocation(id);
    } catch (err: any) {
      setLocationDeleteError(err.message ?? 'Gagal menghapus lokasi');
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
    await addBatch({ ...data, catatan: data.catatan ?? '' });
    setBatchDialogOpen(false);
  };

  const onStockOutSubmit = async (data: StockOutFormOutput) => {
    await stockOut(data.batchId, {
      berat: data.berat,
      tujuan: data.tujuan,
      tanggal: data.tanggal,
      catatan: data.catatan || '',
      namaPembeli: data.namaPembeli?.trim() || undefined,
      hargaRealisasi: data.hargaRealisasi || undefined,
    });
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
    refreshMutations({
      grade: mutFilter !== 'semua' ? mutFilter : undefined,
      from: mutFromDate || undefined,
      to: mutToDate || undefined,
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

  return (
    <StokView
      activeBatches={activeBatches}
      alertBatches={alertBatches}
      backendOnline={backendOnline}
      batchDialogOpen={batchDialogOpen}
      batchForm={batchForm}
      closeConfirmId={closeConfirmId}
      filteredMutations={filteredMutations}
      loading={loading}
      mutFilter={mutFilter}
      mutFromDate={mutFromDate}
      mutToDate={mutToDate}
      onBatchSubmit={onBatchSubmit}
      onStockOutSubmit={onStockOutSubmit}
      openAddBatch={openAddBatch}
      onCloseBatch={handleCloseBatch}
      onConfirmClose={handleConfirmClose}
      onCancelClose={() => setCloseConfirmId(null)}
      onApplyDateFilter={handleApplyDateFilter}
      onResetDateFilter={handleResetDateFilter}
      setBatchDialogOpen={setBatchDialogOpen}
      setMutFilter={setMutFilter}
      setMutFromDate={setMutFromDate}
      setMutToDate={setMutToDate}
      setStockOutDialogOpen={setStockOutDialogOpen}
      setTab={setTab}
      stockOutDialogOpen={stockOutDialogOpen}
      stockOutForm={stockOutForm}
      summary={summary}
      tab={tab}
      weatherRiskNote={weatherRiskNote}
      buyers={buyers}
      stockOutSelectedBatch={stockOutSelectedBatch}
      batchEstimatedValue={batchEstimatedValue}
      stockOutTotal={stockOutTotal}
      stockOutHargaDiff={stockOutHargaDiff}
      grades={grades}
      locations={locations}
      gradeDialogOpen={gradeDialogOpen}
      locationDialogOpen={locationDialogOpen}
      gradeDeleteError={gradeDeleteError}
      locationDeleteError={locationDeleteError}
      setGradeDialogOpen={setGradeDialogOpen}
      setLocationDialogOpen={setLocationDialogOpen}
      onAddGrade={addGrade}
      onRenameGrade={renameGrade}
      onRemoveGrade={handleRemoveGrade}
      onAddLocation={addLocation}
      onRenameLocation={renameLocation}
      onRemoveLocation={handleRemoveLocation}
      onClearGradeDeleteError={() => setGradeDeleteError(null)}
      onClearLocationDeleteError={() => setLocationDeleteError(null)}
    />
  );
}
