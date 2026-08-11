'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';
import { transactionCategoryApi, transactionSatuanApi } from '@/lib/api';
import type { ApiTransactionCategory } from '@/lib/api';

export type MasterItem = ApiTransactionCategory;

const PRESET_KATEGORI_PENGELUARAN = ['Pupuk', 'Pestisida', 'Tenaga Kerja', 'Irigasi & Air', 'Alat Tani', 'Lainnya'];
const PRESET_KATEGORI_PENDAPATAN = ['Penjualan Hasil Panen', 'Jasa', 'Lainnya'];
export const PRESET_SATUAN = ['kg', 'gram', 'ton', 'liter', 'pcs', 'karung', 'ikat', 'botol', 'sak'];

export function useTransactionMasterController() {
  const { user, isGuestMode } = useAuth();
  const storageKey = `arina-master-${user?.id ?? 'guest'}`;
  const [customKategori, setCustomKategori] = useSessionStorage<MasterItem[]>(`${storageKey}-kategori`, []);
  const [customSatuan, setCustomSatuan] = useSessionStorage<MasterItem[]>(`${storageKey}-satuan`, []);
  const [kategoriDialogOpen, setKategoriDialogOpen] = useState(false);
  const [satuanDialogOpen, setSatuanDialogOpen] = useState(false);
  const [deleteKategoriError, setDeleteKategoriError] = useState<string | null>(null);
  const [deleteSatuanError, setDeleteSatuanError] = useState<string | null>(null);

  const loadCustomKategori = useCallback(async () => {
    if (!user || isGuestMode) return;
    try {
      const data = await transactionCategoryApi.getAll();
      setCustomKategori(data);
    } catch {
      // presets masih tersedia
    }
  }, [user]);

  const loadCustomSatuan = useCallback(async () => {
    if (!user || isGuestMode) return;
    try {
      const data = await transactionSatuanApi.getAll();
      setCustomSatuan(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    loadCustomKategori();
    loadCustomSatuan();
  }, [loadCustomKategori, loadCustomSatuan]);

  const allKategori = (jenis: 'pengeluaran' | 'pendapatan'): string[] => {
    const presets = jenis === 'pengeluaran' ? PRESET_KATEGORI_PENGELUARAN : PRESET_KATEGORI_PENDAPATAN;
    return [...presets, ...customKategori.map((k) => k.nama)];
  };

  const allSatuan: string[] = [...PRESET_SATUAN, ...customSatuan.map((s) => s.nama)];

  const addKategori = async (nama: string) => {
    if (isGuestMode) {
      const created: MasterItem = { id: `mock-kat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, nama, createdAt: new Date().toISOString() };
      setCustomKategori((prev) => [...prev, created]);
      return;
    }
    const created = await transactionCategoryApi.create(nama);
    setCustomKategori((prev) => [...prev, created]);
  };

  const renameKategori = async (id: string, nama: string) => {
    if (!isGuestMode) {
      await transactionCategoryApi.update(id, nama);
    }
    setCustomKategori((prev) => prev.map((k) => (k.id === id ? { ...k, nama } : k)));
  };

  const deleteKategori = async (id: string) => {
    try {
      if (!isGuestMode) {
        await transactionCategoryApi.delete(id);
      }
      setCustomKategori((prev) => prev.filter((k) => k.id !== id));
      setDeleteKategoriError(null);
    } catch (err) {
      setDeleteKategoriError(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  const addSatuan = async (nama: string) => {
    if (isGuestMode) {
      const created: MasterItem = { id: `mock-sat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, nama, createdAt: new Date().toISOString() };
      setCustomSatuan((prev) => [...prev, created]);
      return;
    }
    const created = await transactionSatuanApi.create(nama);
    setCustomSatuan((prev) => [...prev, created]);
  };

  const renameSatuan = async (id: string, nama: string) => {
    if (!isGuestMode) {
      await transactionSatuanApi.update(id, nama);
    }
    setCustomSatuan((prev) => prev.map((s) => (s.id === id ? { ...s, nama } : s)));
  };

  const deleteSatuan = async (id: string) => {
    try {
      if (!isGuestMode) {
        await transactionSatuanApi.delete(id);
      }
      setCustomSatuan((prev) => prev.filter((s) => s.id !== id));
      setDeleteSatuanError(null);
    } catch (err) {
      setDeleteSatuanError(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  return {
    customKategori,
    customSatuan,
    kategoriDialogOpen,
    setKategoriDialogOpen,
    satuanDialogOpen,
    setSatuanDialogOpen,
    deleteKategoriError,
    setDeleteKategoriError,
    deleteSatuanError,
    setDeleteSatuanError,
    allKategori,
    allSatuan,
    addKategori,
    renameKategori,
    deleteKategori,
    addSatuan,
    renameSatuan,
    deleteSatuan,
  };
}

export type UseTransactionMasterControllerResult = ReturnType<typeof useTransactionMasterController>;
