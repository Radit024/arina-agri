import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactionsForScenario } from '@/hooks/useTransactionsForScenario';
import { transactionApi } from '@/lib/api';
import type { ApiTransaction } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  transactionApi: {
    getByScenario: vi.fn(),
    createForScenario: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const tx: ApiTransaction = {
  _id: 'tx-1',
  jenis: 'pendapatan',
  kategori: 'Penjualan Padi',
  nominal: 500000,
  tanggal: '2026-06-15',
  keterangan: 'Panen',
  scenarioId: 'scenario-1',
  createdAt: '2026-06-15T00:00:00Z',
  updatedAt: '2026-06-15T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(transactionApi.getByScenario).mockReset();
  vi.mocked(transactionApi.createForScenario).mockReset();
  vi.mocked(transactionApi.update).mockReset();
  vi.mocked(transactionApi.delete).mockReset();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
});

describe('useTransactionsForScenario', () => {
  it('fetches transactions filtered by scenario_id', async () => {
    vi.mocked(transactionApi.getByScenario).mockResolvedValue([tx]);

    const { result } = renderHook(() => useTransactionsForScenario('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(transactionApi.getByScenario).toHaveBeenCalledWith('scenario-1');
    expect(result.current.transactions).toEqual([tx]);
    expect(result.current.error).toBeNull();
  });

  it('returns empty list and does not call the API when scenarioId is null', async () => {
    const { result } = renderHook(() => useTransactionsForScenario(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(transactionApi.getByScenario).not.toHaveBeenCalled();
    expect(result.current.transactions).toEqual([]);
  });

  it('addTransaction sends the scenario_id through to the API and prepends the result', async () => {
    vi.mocked(transactionApi.getByScenario).mockResolvedValue([]);
    vi.mocked(transactionApi.createForScenario).mockResolvedValue(tx);

    const { result } = renderHook(() => useTransactionsForScenario('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTransaction({
        jenis: 'pendapatan',
        kategori: 'Penjualan Padi',
        nominal: 500000,
        tanggal: '2026-06-15',
        keterangan: 'Panen',
      });
    });

    expect(transactionApi.createForScenario).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: 'scenario-1' }),
    );
    expect(result.current.transactions).toEqual([tx]);
  });

  it('updateTransaction and deleteTransaction call through to the API', async () => {
    vi.mocked(transactionApi.getByScenario).mockResolvedValue([tx]);
    const updatedTx = { ...tx, nominal: 600000 };
    vi.mocked(transactionApi.update).mockResolvedValue(updatedTx);
    vi.mocked(transactionApi.delete).mockResolvedValue(null);

    const { result } = renderHook(() => useTransactionsForScenario('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateTransaction('tx-1', { nominal: 600000 });
    });
    expect(transactionApi.update).toHaveBeenCalledWith('tx-1', { nominal: 600000 });
    expect(result.current.transactions).toEqual([updatedTx]);

    await act(async () => {
      await result.current.deleteTransaction('tx-1');
    });
    expect(transactionApi.delete).toHaveBeenCalledWith('tx-1');
    expect(result.current.transactions).toEqual([]);
  });

  it('sets an error message when fetching fails', async () => {
    vi.mocked(transactionApi.getByScenario).mockRejectedValue(new Error('Gagal memuat transaksi'));

    const { result } = renderHook(() => useTransactionsForScenario('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Gagal memuat transaksi');
    expect(result.current.transactions).toEqual([]);
  });

  it('does not fetch while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    const { result } = renderHook(() => useTransactionsForScenario('scenario-1'));

    expect(result.current.loading).toBe(true);
    expect(transactionApi.getByScenario).not.toHaveBeenCalled();
  });
});
