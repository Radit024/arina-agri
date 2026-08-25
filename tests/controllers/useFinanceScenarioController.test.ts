import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinanceScenarioController } from '@/controllers/keuangan/useFinanceScenarioController';
import { useFinanceScenarios } from '@/hooks/useFinanceScenarios';
import type { FinanceScenarioEntity } from '@/lib/finance/rabTypes';

vi.mock('@/hooks/useFinanceScenarios', () => ({
  useFinanceScenarios: vi.fn(),
}));

const projection: FinanceScenarioEntity = {
  id: 'scenario-projection',
  projectId: 'project-1',
  mode: 'PROJECTION',
};

const realization: FinanceScenarioEntity = {
  id: 'scenario-realization',
  projectId: 'project-1',
  mode: 'REALIZATION',
};

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(useFinanceScenarios).mockReturnValue({
    scenarios: [projection, realization],
    loading: false,
    error: null,
    reload: vi.fn(),
  });
});

afterEach(() => {
  window.localStorage.clear();
});

describe('useFinanceScenarioController', () => {
  it('defaults the active mode to PROJECTION', () => {
    const { result } = renderHook(() => useFinanceScenarioController('project-1'));

    expect(result.current.activeMode).toBe('PROJECTION');
  });

  it('resolves activeScenario to the matching scenario row for the current mode', () => {
    const { result } = renderHook(() => useFinanceScenarioController('project-1'));

    expect(result.current.activeScenario).toEqual(projection);
  });

  it('switching mode changes activeScenario', async () => {
    const { result } = renderHook(() => useFinanceScenarioController('project-1'));

    act(() => {
      result.current.setActiveMode('PROJECTION');
    });

    await waitFor(() => expect(result.current.activeMode).toBe('PROJECTION'));
    expect(result.current.activeScenario).toEqual(projection);
  });

  it('persists the selected mode per project in localStorage', async () => {
    const { result, unmount } = renderHook(() => useFinanceScenarioController('project-1'));

    act(() => {
      result.current.setActiveMode('PROJECTION');
    });

    await waitFor(() =>
      expect(window.localStorage.getItem('arina-finance-scenario-mode-project-1')).toBe('"PROJECTION"'),
    );

    unmount();

    const { result: second } = renderHook(() => useFinanceScenarioController('project-1'));
    await waitFor(() => expect(second.current.activeMode).toBe('PROJECTION'));
  });

  it('uses a separate persisted mode per project', async () => {
    const { result: projectA } = renderHook(() => useFinanceScenarioController('project-a'));
    act(() => {
      projectA.current.setActiveMode('PROJECTION');
    });
    await waitFor(() => expect(projectA.current.activeMode).toBe('PROJECTION'));

    const { result: projectB } = renderHook(() => useFinanceScenarioController('project-b'));
    expect(projectB.current.activeMode).toBe('PROJECTION');
  });

  it('returns null activeScenario when no scenario matches the active mode', () => {
    vi.mocked(useFinanceScenarios).mockReturnValue({
      scenarios: [],
      loading: true,
      error: null,
      reload: vi.fn(),
    });

    const { result } = renderHook(() => useFinanceScenarioController('project-1'));

    expect(result.current.activeScenario).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('passes null projectId through to useFinanceScenarios when no project is selected', () => {
    renderHook(() => useFinanceScenarioController(null));

    expect(useFinanceScenarios).toHaveBeenCalledWith(null);
  });
});
