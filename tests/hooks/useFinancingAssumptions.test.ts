import { renderHook, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import { financingAssumptionsApi } from '@/lib/api';
import type { ApiFinancingAssumptions } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  financingAssumptionsApi: {
    getByScenario: vi.fn(),
    upsert: vi.fn(),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const assumptions: ApiFinancingAssumptions = {
  id: 'financing-1',
  scenarioId: 'scenario-1',
  saldoKasAwal: 0,
  modalSendiri: 3_869_000,
  nilaiPinjaman: 15_000_000,
  bungaPerPeriode: 3,
  tanggalPencairan: '2026-08-01',
  tanggalPembayaran: '2026-12-01',
  biayaLain: 0,
};

beforeEach(() => {
  vi.mocked(financingAssumptionsApi.getByScenario).mockReset();
  vi.mocked(financingAssumptionsApi.upsert).mockReset();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
});

describe('useFinancingAssumptions', () => {
  it('returns null when no assumptions exist yet', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockResolvedValue(null);

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assumptions).toBeNull();
  });

  it('fetches assumptions for the given scenario', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockResolvedValue(assumptions);

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(financingAssumptionsApi.getByScenario).toHaveBeenCalledWith('scenario-1');
    expect(result.current.assumptions).toEqual(assumptions);
  });

  it('does not fetch when scenarioId is null', async () => {
    const { result } = renderHook(() => useFinancingAssumptions(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(financingAssumptionsApi.getByScenario).not.toHaveBeenCalled();
    expect(result.current.assumptions).toBeNull();
  });

  it('save() upserts and updates local state', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockResolvedValue(null);
    vi.mocked(financingAssumptionsApi.upsert).mockResolvedValue(assumptions);

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({
        saldoKasAwal: 0,
        modalSendiri: 3_869_000,
        nilaiPinjaman: 15_000_000,
        bungaPerPeriode: 3,
        tanggalPencairan: '2026-08-01',
        tanggalPembayaran: '2026-12-01',
        biayaLain: 0,
      });
    });

    expect(financingAssumptionsApi.upsert).toHaveBeenCalledWith('scenario-1', expect.objectContaining({
      nilaiPinjaman: 15_000_000,
    }));
    expect(result.current.assumptions).toEqual(assumptions);
  });

  it('sets an error message when the fetch fails', async () => {
    vi.mocked(financingAssumptionsApi.getByScenario).mockRejectedValue(new Error('Gagal memuat'));

    const { result } = renderHook(() => useFinancingAssumptions('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Gagal memuat');
  });
});
