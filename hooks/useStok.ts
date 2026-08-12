'use client';

import { useState, useEffect, useCallback } from 'react';
import { stokApi, buyersApi, gradesApi, locationsApi, type ApiHarvestBatch, type ApiStockMutation, type StokSummary, type ApiBuyer, type ApiGrade, type ApiLocation } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';

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
  { _id: 'm1', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'masuk', berat: 400, tanggal: '2026-04-12', catatan: 'Stok awal masuk gudang', createdAt: '2026-04-12T06:00:00Z' },
  { _id: 'm2', batchId: '1', batchCode: 'BATCH-001-A', tipe: 'keluar', berat: 80, tujuan: 'Pasar Lokal', tanggal: '2026-04-14', catatan: 'Jual ke pasar pagi', createdAt: '2026-04-14T08:00:00Z' },
  { _id: 'm3', batchId: '2', batchCode: 'BATCH-002-B', tipe: 'masuk', berat: 350, tanggal: '2026-04-15', catatan: 'Stok awal masuk gudang', createdAt: '2026-04-15T06:00:00Z' },
];

export const DEFAULT_GRADES: ApiGrade[] = [
  { id: 'default-A', nama: 'A', urutan: 0 },
  { id: 'default-B', nama: 'B', urutan: 1 },
  { id: 'default-C', nama: 'C', urutan: 2 },
];

export const DEFAULT_LOCATIONS: ApiLocation[] = [
  { id: 'default-gudang-utama', nama: 'Gudang Utama', urutan: 0 },
  { id: 'default-gudang-cadangan', nama: 'Gudang Cadangan', urutan: 1 },
];

export function computeExpiryDate(tanggalPanen: string): string {
  const date = new Date(tanggalPanen);
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

export function computeStockOutTotal(berat: number, hargaRealisasi: number): number {
  return berat * hargaRealisasi;
}

export interface BatchPerformance {
  bepKg: number | null;
  sudahTerjual: number;
  sisaBepKg: number;
  bepProgress: number;
  sudahBalikModal: boolean;
  estimasiLabaJikaHabis: number;
}

export function computeBatchPerformance(batch: {
  hargaModal: number;
  beratMasuk: number;
  stokTersisa: number;
  hargaJual: number;
}): BatchPerformance {
  const { hargaModal, beratMasuk, stokTersisa, hargaJual } = batch;
  const sudahTerjual = beratMasuk - stokTersisa;

  if (hargaJual <= 0) {
    return { bepKg: null, sudahTerjual, sisaBepKg: 0, bepProgress: 0, sudahBalikModal: false, estimasiLabaJikaHabis: 0 };
  }

  const bepKg = (hargaModal * beratMasuk) / hargaJual;
  const sisaBepKg = Math.max(bepKg - sudahTerjual, 0);
  const bepProgress = bepKg > 0 ? Math.min(sudahTerjual / bepKg, 1) : 0;
  const sudahBalikModal = sudahTerjual >= bepKg;
  const estimasiLabaJikaHabis = stokTersisa * (hargaJual - hargaModal);

  return { bepKg, sudahTerjual, sisaBepKg, bepProgress, sudahBalikModal, estimasiLabaJikaHabis };
}

export function computeLocalSummary(batches: ApiHarvestBatch[]): StokSummary {
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
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const storageKey = `arina-stok-${user?.id ?? 'guest'}`;
  const [batches, setBatches] = useSessionStorage<ApiHarvestBatch[]>(`${storageKey}-batches`, MOCK_BATCHES);
  const [mutations, setMutations] = useSessionStorage<ApiStockMutation[]>(`${storageKey}-mutations`, MOCK_MUTATIONS);
  const [summary, setSummary] = useSessionStorage<StokSummary>(`${storageKey}-summary`, {
    totalStokSiapJual: 0,
    stokTerjualMingguIni: 0,
    estimasiNilaiStok: 0,
    batchHampirKadaluarsa: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<ApiBuyer[]>([]);
  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [locations, setLocations] = useState<ApiLocation[]>([]);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user || isGuestMode) {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data stok');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, isGuestMode, setBatches, setSummary, setMutations]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadBuyers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await buyersApi.getAll();
      setBuyers(data);
    } catch {
      // buyers non-critical, jangan crash
    }
  }, [user]);

  useEffect(() => { loadBuyers(); }, [loadBuyers]);

  const loadGrades = useCallback(async () => {
    if (!user) return;
    try {
      const data = await gradesApi.getAll();
      setGrades(data);
    } catch {
      // non-critical, fallback to DEFAULT_GRADES
    }
  }, [user]);

  const loadLocations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await locationsApi.getAll();
      setLocations(data);
    } catch {
      // non-critical, fallback to DEFAULT_LOCATIONS
    }
  }, [user]);

  useEffect(() => { loadGrades(); }, [loadGrades]);
  useEffect(() => { loadLocations(); }, [loadLocations]);

  // ── CRUD actions ──────────────────────────────────────────────
  const addBatch = async (data: Parameters<typeof stokApi.create>[0]) => {
    if (isGuestMode) {
      const created: ApiHarvestBatch = {
        ...data,
        _id: `mock-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        batchCode: `BATCH-${Date.now()}`,
        stokTersisa: data.beratMasuk,
        status: 'aman',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBatches((prev) => [created, ...prev]);
      setSummary(computeLocalSummary([created, ...batches]));
      return;
    }
    const created = await stokApi.create(data);
    setBatches((prev) => [created, ...prev]);
    await loadData(); // refresh summary
  };

  const updateBatch = async (id: string, data: Partial<ApiHarvestBatch>) => {
    if (isGuestMode) {
      setBatches((prev) => prev.map((b) => (b._id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b)));
      return;
    }
    const updated = await stokApi.update(id, data);
    setBatches((prev) => prev.map((b) => (b._id === id ? updated : b)));
  };

  const closeBatch = async (id: string) => {
    if (!user || isGuestMode) {
      setBatches((prev) => prev.map((b) => b._id === id ? { ...b, status: 'habis' as const } : b));
      return;
    }
    const updated = await stokApi.closeBatch(id);
    setBatches((prev) => prev.map((b) => (b._id === id ? updated : b)));
    await loadData();
  };

  const stockOut = async (batchId: string, outData: Parameters<typeof stokApi.stockOut>[1]) => {
    if (isGuestMode) {
      const batch = batches.find((b) => b._id === batchId);
      if (!batch) return;
      const updatedBatch = { ...batch, stokTersisa: batch.stokTersisa - outData.berat, updatedAt: new Date().toISOString() };
      const mutation: ApiStockMutation = {
        _id: `mock-mut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        batchId,
        batchCode: batch.batchCode,
        tipe: 'keluar',
        berat: outData.berat,
        tanggal: outData.tanggal,
        tujuan: outData.namaPembeli || 'Pembeli Umum',
        hargaRealisasi: outData.hargaRealisasi,
        catatan: outData.catatan,
        createdAt: new Date().toISOString(),
      };
      setBatches((prev) => prev.map((b) => (b._id === batchId ? updatedBatch : b)));
      setMutations((prev) => [mutation, ...prev]);
      setSummary(computeLocalSummary(batches.map(b => b._id === batchId ? updatedBatch : b)));
      return;
    }
    const result = await stokApi.stockOut(batchId, outData);
    setBatches((prev) => prev.map((b) => (b._id === batchId ? result.batch : b)));
    setMutations((prev) => [result.mutation, ...prev]);
    setSummary(computeLocalSummary(batches.map(b => b._id === batchId ? result.batch : b)));

    // Simpan nama pembeli baru ke master data
    if (outData.namaPembeli?.trim()) {
      try {
        await buyersApi.upsert(outData.namaPembeli.trim());
        await loadBuyers();
      } catch {
        // non-critical
      }
    }
  };

  const refreshMutations = async (params?: { grade?: string; from?: string; to?: string }) => {
    const data = await stokApi.getMutations(params);
    setMutations(data);
  };

  // ── Grade CRUD ────────────────────────────────────────────────
  const addGrade = async (nama: string): Promise<ApiGrade> => {
    const created = await gradesApi.create(nama);
    setGrades((prev) => [...prev, created]);
    return created;
  };

  const renameGrade = async (id: string, nama: string): Promise<void> => {
    const updated = await gradesApi.update(id, nama);
    setGrades((prev) => prev.map((g) => (g.id === id ? updated : g)));
  };

  const removeGrade = async (id: string): Promise<void> => {
    await gradesApi.delete(id); // throws if still in use
    setGrades((prev) => prev.filter((g) => g.id !== id));
  };

  // ── Location CRUD ─────────────────────────────────────────────
  const addLocation = async (nama: string): Promise<ApiLocation> => {
    const created = await locationsApi.create(nama);
    setLocations((prev) => [...prev, created]);
    return created;
  };

  const renameLocation = async (id: string, nama: string): Promise<void> => {
    const updated = await locationsApi.update(id, nama);
    setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const removeLocation = async (id: string): Promise<void> => {
    await locationsApi.delete(id); // throws if still in use
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const displayGrades = grades.length > 0 ? grades : DEFAULT_GRADES;
  const displayLocations = locations.length > 0 ? locations : DEFAULT_LOCATIONS;

  return {
    batches, mutations, summary, loading, backendOnline: !isGuestMode, error, buyers,
    grades: displayGrades,
    locations: displayLocations,
    addBatch, updateBatch, closeBatch, stockOut, refreshMutations, reload: loadData,
    addGrade, renameGrade, removeGrade,
    addLocation, renameLocation, removeLocation,
  };
}
