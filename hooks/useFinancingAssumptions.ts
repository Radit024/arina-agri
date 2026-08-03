'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { financingAssumptionsApi, type ApiFinancingAssumptions } from '@/lib/api';
import type { FinancingAssumptions } from '@/lib/finance/rabTypes';

export function useFinancingAssumptions(scenarioId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [assumptions, setAssumptions] = useState<ApiFinancingAssumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!scenarioId || !user) {
        setAssumptions(null);
        setError(null);
        return;
      }
      const data = await financingAssumptionsApi.getByScenario(scenarioId);
      setAssumptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat asumsi pembiayaan');
    } finally {
      setLoading(false);
    }
  }, [authLoading, scenarioId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async (payload: Omit<FinancingAssumptions, 'id' | 'scenarioId'>) => {
    if (!scenarioId) throw new Error('Scenario belum dipilih');
    const saved = await financingAssumptionsApi.upsert(scenarioId, payload);
    setAssumptions(saved);
    return saved;
  };

  return { assumptions, loading, error, save, reload: loadData };
}
