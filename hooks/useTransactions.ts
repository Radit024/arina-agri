'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionApi, type ApiTransaction } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { mockTransactions } from '@/lib/mockData';

// Map mock format to Api format for local fallback
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
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const data = await transactionApi.getAll();
      setTransactions(data);
      setBackendOnline(true);
      setError(null);
    } catch {
      // Fallback
      const fallback = user ? [] : MOCK_TRANSACTIONS;
      setTransactions(fallback);
      setBackendOnline(false);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTransaction = async (data: Parameters<typeof transactionApi.create>[0]) => {
    if (backendOnline) {
      const created = await transactionApi.create(data);
      setTransactions((prev) => [created, ...prev]);
    } else {
      const newTx: ApiTransaction = {
        ...data,
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const updateTransaction = async (id: string, data: Partial<ApiTransaction>) => {
    if (backendOnline) {
      const updated = await transactionApi.update(id, data);
      setTransactions((prev) => prev.map((tx) => (tx._id === id ? updated : tx)));
    } else {
      setTransactions((prev) => prev.map((tx) => (tx._id === id ? { ...tx, ...data, updatedAt: new Date().toISOString() } : tx)));
    }
  };

  const deleteTransaction = async (id: string) => {
    if (backendOnline) {
      await transactionApi.delete(id);
    }
    setTransactions((prev) => prev.filter((tx) => tx._id !== id));
  };

  return {
    transactions,
    loading,
    backendOnline,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reload: loadData,
  };
}
