'use client';

import { useMemo } from 'react';

import useLocalStorage from '@/hooks/useLocalStorage';
import { useFinanceScenarios } from '@/hooks/useFinanceScenarios';
import type { ScenarioMode, FinanceScenarioEntity } from '@/lib/finance/rabTypes';

/**
 * Manages the active scenario mode (PROJECTION | REALIZATION) per project.
 * Persists selection in localStorage so it survives page refreshes.
 * Default mode: REALIZATION (per audit §9.3).
 */
export function useFinanceScenarioController(projectId: string | null | undefined) {
  const pid = projectId ?? null;
  const storageKey = `arina-finance-scenario-mode-${pid ?? 'none'}`;
  const [activeMode, setActiveMode] = useLocalStorage<ScenarioMode>(storageKey, 'REALIZATION');

  const { scenarios, loading, error } = useFinanceScenarios(pid);

  const activeScenario: FinanceScenarioEntity | null = useMemo(
    () => scenarios.find((s) => s.mode === activeMode) ?? null,
    [scenarios, activeMode],
  );

  return {
    scenarios,
    activeMode,
    setActiveMode,
    activeScenario,
    loading,
    error,
  };
}

export type UseFinanceScenarioControllerResult = ReturnType<typeof useFinanceScenarioController>;
