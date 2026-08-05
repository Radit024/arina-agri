import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinanceScenarios } from '@/hooks/useFinanceScenarios';
import { financeScenarioApi } from '@/lib/api';
import type { ApiFinanceScenario } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  financeScenarioApi: {
    getOrCreateForProject: vi.fn(),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const projection: ApiFinanceScenario = {
  id: 'scenario-projection',
  projectId: 'project-1',
  mode: 'PROJECTION',
};

const realization: ApiFinanceScenario = {
  id: 'scenario-realization',
  projectId: 'project-1',
  mode: 'REALIZATION',
};

beforeEach(() => {
  vi.mocked(financeScenarioApi.getOrCreateForProject).mockReset();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
});

describe('useFinanceScenarios', () => {
  it('fetches existing scenarios for a project', async () => {
    vi.mocked(financeScenarioApi.getOrCreateForProject).mockResolvedValue([projection, realization]);

    const { result } = renderHook(() => useFinanceScenarios('project-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(financeScenarioApi.getOrCreateForProject).toHaveBeenCalledWith('project-1');
    expect(result.current.scenarios).toEqual([projection, realization]);
    expect(result.current.error).toBeNull();
  });

  it('auto-creates missing scenario rows when the project has none (delegated to the API)', async () => {
    // getOrCreateForProject is responsible for the create-if-missing behavior server-side;
    // the hook simply surfaces whatever it returns.
    vi.mocked(financeScenarioApi.getOrCreateForProject).mockResolvedValue([projection, realization]);

    const { result } = renderHook(() => useFinanceScenarios('project-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.scenarios).toHaveLength(2);
    expect(result.current.scenarios.map((s) => s.mode).sort()).toEqual(['PROJECTION', 'REALIZATION']);
  });

  it('does not duplicate a scenario that already exists (idempotency reflected via a single call)', async () => {
    vi.mocked(financeScenarioApi.getOrCreateForProject).mockResolvedValue([projection, realization]);

    const { result, rerender } = renderHook(({ projectId }) => useFinanceScenarios(projectId), {
      initialProps: { projectId: 'project-1' },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(financeScenarioApi.getOrCreateForProject).toHaveBeenCalledTimes(1);

    rerender({ projectId: 'project-1' });

    // Same projectId/user -> loadData callback identity unchanged -> no extra fetch.
    expect(financeScenarioApi.getOrCreateForProject).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list and does not call the API when there is no project selected', async () => {
    const { result } = renderHook(() => useFinanceScenarios(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(financeScenarioApi.getOrCreateForProject).not.toHaveBeenCalled();
    expect(result.current.scenarios).toEqual([]);
  });

  it('sets an error message when the API call fails', async () => {
    vi.mocked(financeScenarioApi.getOrCreateForProject).mockRejectedValue(new Error('Gagal memuat skenario'));

    const { result } = renderHook(() => useFinanceScenarios('project-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Gagal memuat skenario');
    expect(result.current.scenarios).toEqual([]);
  });

  it('does not fetch while auth is still loading', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    const { result } = renderHook(() => useFinanceScenarios('project-1'));

    expect(result.current.loading).toBe(true);
    expect(financeScenarioApi.getOrCreateForProject).not.toHaveBeenCalled();
  });

  it('reload() re-fetches the scenarios', async () => {
    vi.mocked(financeScenarioApi.getOrCreateForProject).mockResolvedValue([projection]);

    const { result } = renderHook(() => useFinanceScenarios('project-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(financeScenarioApi.getOrCreateForProject).toHaveBeenCalledTimes(1);

    vi.mocked(financeScenarioApi.getOrCreateForProject).mockResolvedValue([projection, realization]);
    await result.current.reload();

    await waitFor(() => expect(result.current.scenarios).toHaveLength(2));
    expect(financeScenarioApi.getOrCreateForProject).toHaveBeenCalledTimes(2);
  });
});
