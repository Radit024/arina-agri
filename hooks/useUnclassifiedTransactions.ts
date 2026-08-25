'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { migrationApi, type ApiTransaction } from '@/lib/api';

export function useUnclassifiedTransactions(projectId: string | null) {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const [unclassified, setUnclassified] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (isGuestMode) {
      setUnclassified([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (!projectId || !user) {
        setUnclassified([]);
        setError(null);
        return;
      }
      const data = await migrationApi.getUnclassifiedTransactions(projectId);
      setUnclassified(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi belum diklasifikasikan');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isGuestMode, projectId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    unclassified,
    count: unclassified.length,
    loading,
    error,
    reload: loadData,
  };
}
