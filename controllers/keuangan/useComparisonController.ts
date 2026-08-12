'use client';

import { useMemo } from 'react';

import { useScenarioOutput } from '@/controllers/keuangan/useScenarioOutput';
import type { ApiFinanceProject } from '@/lib/api';
import { compareScenarios } from '@/lib/finance/scenarioCalculations';
import type { FinanceScenarioEntity, ScenarioComparison, ScenarioOutput } from '@/lib/finance/rabTypes';

export interface UseComparisonControllerResult {
  comparison: ScenarioComparison | null;
  loading: boolean;
  error: string | null;
  hasEnoughData: boolean;
  projectionHasData: boolean;
  realizationHasData: boolean;
  projectionOutput: ScenarioOutput;
  realizationOutput: ScenarioOutput;
}

export function useComparisonController({
  scenarios,
  project,
  active = true,
}: {
  scenarios: FinanceScenarioEntity[];
  project: ApiFinanceProject | null;
  active?: boolean;
}): UseComparisonControllerResult {
  const projectionScenario = useMemo(
    () => scenarios.find((s) => s.mode === 'PROJECTION') ?? null,
    [scenarios],
  );
  const realizationScenario = useMemo(
    () => scenarios.find((s) => s.mode === 'REALIZATION') ?? null,
    [scenarios],
  );

  const projectionId = active ? projectionScenario?.id ?? null : null;
  const realizationId = active ? realizationScenario?.id ?? null : null;

  const projection = useScenarioOutput({ scenarioId: projectionId, project });
  const realization = useScenarioOutput({ scenarioId: realizationId, project });

  const hasEnoughData = projection.hasData && realization.hasData;

  const comparison = useMemo(() => {
    if (!hasEnoughData) {
      return null;
    }
    return compareScenarios(projection.output, realization.output);
  }, [hasEnoughData, projection.output, realization.output]);

  return {
    comparison,
    loading: active ? projection.loading || realization.loading : false,
    error: active ? projection.error || realization.error : null,
    hasEnoughData,
    projectionHasData: projection.hasData,
    realizationHasData: realization.hasData,
    projectionOutput: projection.output,
    realizationOutput: realization.output,
  };
}
