'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { financeScenarioApi, migrationApi, type ApiFinanceScenario } from '@/lib/api';

export function useFinanceScenarios(projectId: string | null) {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const [scenarios, setScenarios] = useState<ApiFinanceScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user || isGuestMode) {
        const pid = projectId || 'default';
        const now = new Date().toISOString();
        const mockScenarios: ApiFinanceScenario[] = [
          {
            id: `guest-proj-${pid}`,
            projectId: pid,
            mode: 'PROJECTION',
            createdAt: now,
            updatedAt: now,
          },
          {
            id: `guest-real-${pid}`,
            projectId: pid,
            mode: 'REALIZATION',
            createdAt: now,
            updatedAt: now,
          },
        ];
        setScenarios(mockScenarios);
        setError(null);
        return;
      }
      if (!projectId) {
        setScenarios([]);
        setError(null);
        return;
      }
      const data = await financeScenarioApi.getOrCreateForProject(projectId);
      const projScenario = data.find((s) => s.mode === 'PROJECTION');
      if (projScenario) {
        try {
          await migrationApi.autoMigrateLegacyRab(projectId, projScenario.id);
        } catch (migErr) {
          console.error('[useFinanceScenarios] Gagal auto-migrasi RAB legacy:', migErr);
        }
      }
      setScenarios(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat skenario');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isGuestMode, projectId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { scenarios, loading, error, reload: loadData };
}
