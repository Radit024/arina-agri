'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { productionSalesAssumptionsApi, type ApiProductionSalesAssumptions } from '@/lib/api';
import type { ProductionSalesAssumptions } from '@/lib/finance/rabTypes';

export function useProductionSalesAssumptions(scenarioId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [assumptions, setAssumptions] = useState<ApiProductionSalesAssumptions | null>(null);
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
      const data = await productionSalesAssumptionsApi.getByScenario(scenarioId);
      setAssumptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat asumsi produksi & penjualan');
    } finally {
      setLoading(false);
    }
  }, [authLoading, scenarioId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async (payload: Omit<ProductionSalesAssumptions, 'id' | 'scenarioId'>) => {
    if (!scenarioId) throw new Error('Scenario belum dipilih');
    const saved = await productionSalesAssumptionsApi.upsert(scenarioId, payload);
    setAssumptions(saved);
    return saved;
  };

  return { assumptions, loading, error, save, reload: loadData };
}
