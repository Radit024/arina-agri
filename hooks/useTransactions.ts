'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionApi, type ApiTransaction } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';
import { mockTransactions } from '@/lib/mockData';

const MOCK_TRANSACTIONS: ApiTransaction[] = mockTransactions.map((tx) => ({
  _id: tx.id,
  jenis: tx.jenis as 'pengeluaran' | 'pendapatan',
  kategori: tx.kategori,
  nominal: tx.nominal,
  tanggal: tx.tanggal,
  keterangan: tx.keterangan || '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export function useTransactions() {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const storageKey = `arina-transactions-${user?.id ?? 'guest'}`;
  const [transactions, setTransactions] = useSessionStorage<ApiTransaction[]>(storageKey, MOCK_TRANSACTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user || isGuestMode) {
        setLoading(false);
        return;
      }
      const data = await transactionApi.getAll();
      setTransactions(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, isGuestMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTransaction = async (data: Parameters<typeof transactionApi.create>[0]) => {
    if (isGuestMode) {
      const now = new Date().toISOString();
      const created: ApiTransaction = {
        ...data,
        _id: `mock-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        keterangan: data.keterangan || '',
        createdAt: now,
        updatedAt: now,
      };
      setTransactions((prev) => [created, ...prev]);
      return;
    }
    const created = await transactionApi.create(data);
    setTransactions((prev) => [created, ...prev]);
  };

  const updateTransaction = async (id: string, data: Partial<ApiTransaction>) => {
    if (isGuestMode) {
      const now = new Date().toISOString();
      setTransactions((prev) => prev.map((tx) => (tx._id === id ? { ...tx, ...data, updatedAt: now } : tx)));
      return;
    }
    const updated = await transactionApi.update(id, data);
    setTransactions((prev) => prev.map((tx) => (tx._id === id ? updated : tx)));
  };

  const deleteTransaction = async (id: string) => {
    if (isGuestMode) {
      setTransactions((prev) => prev.filter((tx) => tx._id !== id));
      return;
    }
    await transactionApi.delete(id);
    setTransactions((prev) => prev.filter((tx) => tx._id !== id));
  };

  return {
    transactions,
    loading,
    backendOnline: true,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reload: loadData,
  };
}
