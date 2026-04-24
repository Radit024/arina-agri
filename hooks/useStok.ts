'use client';

import { useState, useEffect, useCallback } from 'react';
import { stokApi, type ApiHarvestBatch, type ApiStockMutation, type StokSummary } from '@/lib/api';

// ─── Mock data as fallback when backend is not running ────────────
const MOCK_BATCHES: ApiHarvestBatch[] = [
  {
    _id: '1',
    batchCode: 'BATCH-001-A',
    tanggalPanen: '2026-04-12',
    grade: 'A',
    beratMasuk: 400,
    stokTersisa: 280,
    hargaModal: 18000,
    hargaJual: 45000,
    lokasiPenyimpanan: 'Gudang Utama',
    estimasiKadaluarsa: '2026-04-26',
    catatan: 'Panen pagi kondisi optimal',
    status: 'aman',
    createdAt: '2026-04-12T06:00:00Z',
    updatedAt: '2026-04-12T06:00:00Z',
  },
  {
    _id: '2',
    batchCode: 'BATCH-002-B',
    tanggalPanen: '2026-04-15',
    grade: 'B',
    beratMasuk: 350,
    stokTersisa: 60,
    hargaModal: 16000,
    hargaJual: 38000,
    lokasiPenyimpanan: 'Gudang Cadangan',
    estimasiKadaluarsa: '2026-04-28',
    catatan: 'Sortir ulang grade B',
    status: 'menipis',
    createdAt: '2026-04-15T06:00:00Z',
    updatedAt: '2026-04-15T06:00:00Z',
  },
  {
    _id: '3',
    batchCode: 'BATCH-003-A',
    tanggalPanen: '2026-04-18',
    grade: 'A',
    beratMasuk: 420,
    stokTersisa: 420,
    hargaModal: 18000,
    hargaJual: 46000,
    lokasiPenyimpanan: 'Gudang Utama',
    estimasiKadaluarsa: '2026-05-02',
    catatan: 'Panen perdana batch baru',
    status: 'aman',
    createdAt: '2026-04-18T06:00:00Z',
    updatedAt: '2026-04-18T06:00:00Z',
  },
  {
    _id: '4',
    batchCode: 'BATCH-004-C',
    tanggalPanen: '2026-04-20',
    grade: 'C',
    beratMasuk: 180,
    stokTersisa: 180,
    hargaModal: 12000,
    hargaJual: 28000,
    lokasiPenyimpanan: 'Gudang Cadangan',
    estimasiKadaluarsa: '2026-04-24',
    catatan: 'Grade C untuk pasar lokal, segera jual',
    status: 'hampir_kadaluarsa',
    createdAt: '2026-04-20T06:00:00Z',
    updatedAt: '2026-04-20T06:00:00Z',
  },
];

const MOCK_MUTATIONS: ApiStockMutation[] = [
  { _id: 'm1', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'masuk', berat: 400, tanggal: '2026-04-12', catatan: 'Panen awal masuk gudang', createdAt: '2026-04-12T06:00:00Z' },
  { _id: 'm2', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'keluar', berat: 80, tujuan: 'Pasar Lokal', tanggal: '2026-04-14', catatan: 'Jual ke pasar pagi', createdAt: '2026-04-14T08:00:00Z' },
  { _id: 'm3', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'keluar', berat: 40, tujuan: 'Distributor', tanggal: '2026-04-16', catatan: 'Order Pak Hendra', createdAt: '2026-04-16T09:00:00Z' },
  { _id: 'm4', batchId: '2', batchCode: 'BATCH-002-B', tipe: 'masuk', berat: 350, tanggal: '2026-04-15', catatan: 'Panen awal masuk gudang', createdAt: '2026-04-15T06:00:00Z' },
  { _id: 'm5', batchId: '2', batchCode: 'BATCH-002-B', tipe: 'keluar', berat: 200, tujuan: 'Restoran', tanggal: '2026-04-17', catatan: 'Order mingguan Restoran Sari Rasa', createdAt: '2026-04-17T10:00:00Z' },
  { _id: 'm6', batchId: '3', batchCode: 'BATCH-003-A', tipe: 'masuk', berat: 420, tanggal: '2026-04-18', catatan: 'Panen awal masuk gudang', createdAt: '2026-04-18T06:00:00Z' },
  { _id: 'm7', batchId: '4', batchCode: 'BATCH-004-C', tipe: 'masuk', berat: 180, tanggal: '2026-04-20', catatan: 'Panen awal masuk gudang', createdAt: '2026-04-20T06:00:00Z' },
];

// ─── useStok Hook ─────────────────────────────────────────────────
import { useAuth } from '@/context/AuthContext';

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
  const [backendOnline, setBackendOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeLocalSummary = useCallback((b: ApiHarvestBatch[]) => {
    const totalStokSiapJual = b.filter((x) => x.status !== 'habis').reduce((s, x) => s + x.stokTersisa, 0);
    const estimasiNilaiStok = b.filter((x) => x.status !== 'habis').reduce((s, x) => s + x.stokTersisa * x.hargaJual, 0);
    const batchHampirKadaluarsa = b.filter((x) => x.status === 'hampir_kadaluarsa').length;
    setSummary({ totalStokSiapJual, stokTerjualMingguIni: 290, estimasiNilaiStok, batchHampirKadaluarsa });
  }, []);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const [batchData, summaryData, mutationData] = await Promise.all([
        stokApi.getAll(),
        stokApi.getSummary(),
        stokApi.getMutations(),
      ]);
      setBatches(batchData);
      setSummary(summaryData);
      setMutations(mutationData);
      setBackendOnline(true);
      setError(null);
    } catch {
      // Backend offline — use mock data only if not logged in
      const fallbackBatches = user ? [] : MOCK_BATCHES;
      const fallbackMutations = user ? [] : MOCK_MUTATIONS;
      setBatches(fallbackBatches);
      setMutations(fallbackMutations);
      computeLocalSummary(fallbackBatches);
      setBackendOnline(false);
      setError(null); // silent fallback
    } finally {
      setLoading(false);
    }
  }, [computeLocalSummary, user, authLoading]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── CRUD actions ──────────────────────────────────────────────
  const addBatch = async (data: Parameters<typeof stokApi.create>[0]) => {
    if (backendOnline) {
      const created = await stokApi.create(data);
      setBatches((prev) => [created, ...prev]);
      await loadData(); // refresh summary
    } else {
      // Local mock
      const newBatch: ApiHarvestBatch = {
        ...data,
        _id: Date.now().toString(),
        batchCode: `BATCH-${String(batches.length + 1).padStart(3, '0')}-${data.grade}`,
        stokTersisa: data.beratMasuk,
        status: 'aman',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBatches((prev) => [newBatch, ...prev]);
      computeLocalSummary([newBatch, ...batches]);
    }
  };

  const updateBatch = async (id: string, data: Partial<ApiHarvestBatch>) => {
    if (backendOnline) {
      const updated = await stokApi.update(id, data);
      setBatches((prev) => prev.map((b) => (b._id === id ? updated : b)));
    } else {
      setBatches((prev) => prev.map((b) => (b._id === id ? { ...b, ...data } : b)));
    }
  };

  const deleteBatch = async (id: string) => {
    if (backendOnline) {
      await stokApi.delete(id);
    }
    setBatches((prev) => prev.filter((b) => b._id !== id));
    setMutations((prev) => prev.filter((m) => m.batchId !== id));
    computeLocalSummary(batches.filter((b) => b._id !== id));
  };

  const stockOut = async (batchId: string, outData: Parameters<typeof stokApi.stockOut>[1]) => {
    if (backendOnline) {
      const result = await stokApi.stockOut(batchId, outData);
      setBatches((prev) => prev.map((b) => (b._id === batchId ? result.batch : b)));
      setMutations((prev) => [result.mutation, ...prev]);
      computeLocalSummary(batches.map((b) => (b._id === batchId ? result.batch : b)));
    } else {
      const newMutation: ApiStockMutation = {
        _id: Date.now().toString(),
        batchId,
        batchCode: batches.find((b) => b._id === batchId)?.batchCode || '',
        tipe: 'keluar',
        ...outData,
        createdAt: new Date().toISOString(),
      };
      setBatches((prev) =>
        prev.map((b) => {
          if (b._id !== batchId) return b;
          const newSisa = b.stokTersisa - outData.berat;
          return { ...b, stokTersisa: newSisa, status: newSisa === 0 ? 'habis' : newSisa < b.beratMasuk * 0.2 ? 'menipis' : b.status };
        })
      );
      setMutations((prev) => [newMutation, ...prev]);
    }
  };

  const refreshMutations = async (params?: { grade?: string; from?: string; to?: string }) => {
    if (backendOnline) {
      const data = await stokApi.getMutations(params);
      setMutations(data);
    }
  };

  return {
    batches, mutations, summary, loading, backendOnline, error,
    addBatch, updateBatch, deleteBatch, stockOut, refreshMutations, reload: loadData,
  };
}
