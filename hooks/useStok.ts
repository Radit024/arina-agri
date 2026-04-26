'use client';

import { useState, useEffect, useCallback } from 'react';
import { stokApi, type ApiHarvestBatch, type ApiStockMutation, type StokSummary } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ─── Mock data for unauthenticated users ──────────────────────────
const MOCK_BATCHES: ApiHarvestBatch[] = [
  {
    _id: '1', batchCode: 'BATCH-001-A', tanggalPanen: '2026-04-12', grade: 'A',
    beratMasuk: 400, stokTersisa: 280, hargaModal: 18000, hargaJual: 45000,
    lokasiPenyimpanan: 'Gudang Utama', estimasiKadaluarsa: '2026-04-26',
    catatan: 'Panen pagi kondisi optimal', status: 'aman',
    createdAt: '2026-04-12T06:00:00Z', updatedAt: '2026-04-12T06:00:00Z',
  },
  {
    _id: '2', batchCode: 'BATCH-002-B', tanggalPanen: '2026-04-15', grade: 'B',
    beratMasuk: 350, stokTersisa: 60, hargaModal: 16000, hargaJual: 38000,
    lokasiPenyimpanan: 'Gudang Cadangan', estimasiKadaluarsa: '2026-04-28',
    catatan: 'Sortir ulang grade B', status: 'menipis',
    createdAt: '2026-04-15T06:00:00Z', updatedAt: '2026-04-15T06:00:00Z',
  },
];

const MOCK_MUTATIONS: ApiStockMutation[] = [
  { _id: 'm1', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'masuk', berat: 400, tanggal: '2026-04-12', catatan: 'Panen awal masuk gudang', createdAt: '2026-04-12T06:00:00Z' },
  { _id: 'm2', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'keluar', berat: 80, tujuan: 'Pasar Lokal', tanggal: '2026-04-14', catatan: 'Jual ke pasar pagi', createdAt: '2026-04-14T08:00:00Z' },
  { _id: 'm3', batchId: '2', batchCode: 'BATCH-002-B', tipe: 'masuk', berat: 350, tanggal: '2026-04-15', catatan: 'Panen awal masuk gudang', createdAt: '2026-04-15T06:00:00Z' },
];

function computeLocalSummary(batches: ApiHarvestBatch[]): StokSummary {
  const active = batches.filter(b => b.status !== 'habis');
  return {
    totalStokSiapJual: active.reduce((s, b) => s + b.stokTersisa, 0),
    stokTerjualMingguIni: 0,
    estimasiNilaiStok: active.reduce((s, b) => s + b.stokTersisa * b.hargaJual, 0),
    batchHampirKadaluarsa: batches.filter(b => b.status === 'hampir_kadaluarsa').length,
  };
}

// ─── useStok Hook ─────────────────────────────────────────────────
export function useStok() {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<ApiHarvestBatch[]>([]);
  const [mutations, setMutations] = useState<ApiStockMutation[]>([]);
  const [summary, setSummary] = useState<StokSummary>({
    totalStokSiapJual: 0,
    stokTerjualMingguIni: 0,
    estimasiNilaiStok: 0,
    batchHampirKadaluarsa: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user) {
        setBatches(MOCK_BATCHES);
        setMutations(MOCK_MUTATIONS);
        setSummary(computeLocalSummary(MOCK_BATCHES));
        setLoading(false);
        return;
      }
      const [batchData, summaryData, mutationData] = await Promise.all([
        stokApi.getAll(),
        stokApi.getSummary(),
        stokApi.getMutations(),
      ]);
      setBatches(batchData);
      setSummary(summaryData);
      setMutations(mutationData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data stok');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── CRUD actions ──────────────────────────────────────────────
  const addBatch = async (data: Parameters<typeof stokApi.create>[0]) => {
    const created = await stokApi.create(data);
    setBatches((prev) => [created, ...prev]);
    await loadData(); // refresh summary
  };

  const updateBatch = async (id: string, data: Partial<ApiHarvestBatch>) => {
    const updated = await stokApi.update(id, data);
    setBatches((prev) => prev.map((b) => (b._id === id ? updated : b)));
  };

  const deleteBatch = async (id: string) => {
    await stokApi.delete(id);
    setBatches((prev) => prev.filter((b) => b._id !== id));
    setMutations((prev) => prev.filter((m) => m.batchId !== id));
  };

  const stockOut = async (batchId: string, outData: Parameters<typeof stokApi.stockOut>[1]) => {
    const result = await stokApi.stockOut(batchId, outData);
    setBatches((prev) => prev.map((b) => (b._id === batchId ? result.batch : b)));
    setMutations((prev) => [result.mutation, ...prev]);
    setSummary(computeLocalSummary(batches.map(b => b._id === batchId ? result.batch : b)));
  };

  const refreshMutations = async (params?: { grade?: string; from?: string; to?: string }) => {
    const data = await stokApi.getMutations(params);
    setMutations(data);
  };

  return {
    batches, mutations, summary, loading, backendOnline: true, error,
    addBatch, updateBatch, deleteBatch, stockOut, refreshMutations, reload: loadData,
  };
}
