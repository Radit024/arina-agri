'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useStok } from '@/hooks/useStok';
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
  const { batches, mutations, summary, loading, backendOnline, addBatch, deleteBatch, stockOut } = useStok();
  const { riskNote: weatherRiskNote } = useWeatherRiskSignal('stock');
  const [tab, setTab] = useState(0);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [stockOutDialogOpen, setStockOutDialogOpen] = useState(false);
  const [mutFilter, setMutFilter] = useState('semua');

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

  const openAddBatch = () => {
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

  const alertBatches = batches.filter((batch) => batch.status === 'hampir_kadaluarsa');
  const activeBatches = batches.filter((batch) => batch.status !== 'habis');
  const filteredMutations = mutFilter === 'semua'
    ? mutations
    : mutations.filter((mutation) => mutation.batchCode.includes(`-${mutFilter}`));

  return (
    <StokView
      activeBatches={activeBatches}
      alertBatches={alertBatches}
      backendOnline={backendOnline}
      batchDialogOpen={batchDialogOpen}
      batchForm={batchForm}
      deleteBatch={deleteBatch}
      filteredMutations={filteredMutations}
      loading={loading}
      mutFilter={mutFilter}
      onBatchSubmit={onBatchSubmit}
      onStockOutSubmit={onStockOutSubmit}
      openAddBatch={openAddBatch}
      setBatchDialogOpen={setBatchDialogOpen}
      setMutFilter={setMutFilter}
      setStockOutDialogOpen={setStockOutDialogOpen}
      setTab={setTab}
      stockOutDialogOpen={stockOutDialogOpen}
      stockOutForm={stockOutForm}
      summary={summary}
      tab={tab}
      weatherRiskNote={weatherRiskNote}
    />
  );
}
