'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { financeScenarioApi, type ApiFinanceScenario } from '@/lib/api';

export function useFinanceScenarios(projectId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [scenarios, setScenarios] = useState<ApiFinanceScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!projectId || !user) {
        setScenarios([]);
        setError(null);
        return;
      }
      const data = await financeScenarioApi.getOrCreateForProject(projectId);
      setScenarios(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat skenario');
    } finally {
      setLoading(false);
    }
  }, [authLoading, projectId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { scenarios, loading, error, reload: loadData };
}
