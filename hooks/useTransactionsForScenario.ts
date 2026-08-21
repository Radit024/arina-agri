'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionApi, type ApiTransaction } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';

/**
 * Scenario-aware version of useTransactions.
 * Fetches transactions WHERE scenario_id = scenarioId.
 * Shape identical to useTransactions so existing consumers need minimal changes.
 */
export function useTransactionsForScenario(scenarioId: string | null) {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const storageKey = `arina-scenario-transactions-${scenarioId ?? (isGuestMode ? 'guest-default' : 'none')}`;
  const [transactions, setTransactions] = useSessionStorage<ApiTransaction[]>(storageKey, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (isGuestMode) {
        setLoading(false);
        return;
      }
      if (!scenarioId || !user) {
        setTransactions([]);
        setError(null);
        return;
      }
      const data = await transactionApi.getByScenario(scenarioId);
      setTransactions(data);
      setError(null);
    } catch (err: unknown) {
      // In case of backend error (e.g. offline/mock/demo 400), preserve transactions already in sessionStorage
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [scenarioId, user, authLoading, isGuestMode, setTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTransaction = async (
    data: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'> & { scenarioId?: string | null },
  ) => {
    const sid = data.scenarioId ?? scenarioId ?? '';
    const isCurrentScenario = sid === scenarioId;

    if (isGuestMode) {
      const now = new Date().toISOString();
      const created: ApiTransaction = {
        ...data,
        _id: `mock-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        keterangan: data.keterangan || '',
        createdAt: now,
        updatedAt: now,
      };
      if (isCurrentScenario) {
        setTransactions((prev) => [created, ...prev]);
      } else {
        const targetStorageKey = `arina-scenario-transactions-${sid || 'none'}`;
        if (typeof window !== 'undefined') {
          try {
            const raw = window.sessionStorage.getItem(targetStorageKey);
            const prev = raw ? (JSON.parse(raw) as ApiTransaction[]) : [];
            window.sessionStorage.setItem(targetStorageKey, JSON.stringify([created, ...prev]));
          } catch {
            // ignore
          }
        }
      }
      return;
    }

    try {
      const created = await transactionApi.createForScenario({ ...data, scenarioId: sid });
      if (isCurrentScenario) {
        setTransactions((prev) => [created, ...prev]);
      }
    } catch {
      // Fallback for demo or offline when backend throws
      const now = new Date().toISOString();
      const fallback: ApiTransaction = {
        ...data,
        _id: `fallback-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        keterangan: data.keterangan || '',
        createdAt: now,
        updatedAt: now,
      };
      if (isCurrentScenario) {
        setTransactions((prev) => [fallback, ...prev]);
      } else {
        const targetStorageKey = `arina-scenario-transactions-${sid || 'none'}`;
        if (typeof window !== 'undefined') {
          try {
            const raw = window.sessionStorage.getItem(targetStorageKey);
            const prev = raw ? (JSON.parse(raw) as ApiTransaction[]) : [];
            window.sessionStorage.setItem(targetStorageKey, JSON.stringify([fallback, ...prev]));
          } catch {
            // ignore
          }
        }
      }
    }
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
