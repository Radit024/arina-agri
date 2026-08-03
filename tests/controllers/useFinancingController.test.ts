import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFinancingController } from '@/controllers/keuangan/useFinancingController';
import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import type { ArusKasBulanan } from '@/lib/finance/rabTypes';

vi.mock('@/hooks/useFinancingAssumptions', () => ({
  useFinancingAssumptions: vi.fn(),
}));

const arusKasBulanan: ArusKasBulanan[] = [
  { bulan: '2026-07', kasMasuk: 0, kasKeluar: 7_412_500, kasBersih: -7_412_500, kasKumulatif: -7_412_500 },
  { bulan: '2026-08', kasMasuk: 0, kasKeluar: 14_746_500, kasBersih: -14_746_500, kasKumulatif: -22_159_000 },
  { bulan: '2026-09', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: -22_159_000 },
  { bulan: '2026-10', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: -22_159_000 },
  { bulan: '2026-11', kasMasuk: 0, kasKeluar: 0, kasBersih: 0, kasKumulatif: -22_159_000 },
  { bulan: '2026-12', kasMasuk: 45_500_000, kasKeluar: 0, kasBersih: 45_500_000, kasKumulatif: 23_341_000 },
];

const save = vi.fn();

beforeEach(() => {
  save.mockReset().mockResolvedValue(undefined);
  vi.mocked(useFinancingAssumptions).mockReturnValue({
    assumptions: null,
    loading: false,
    error: null,
    save,
    reload: vi.fn(),
  });
});

describe('useFinancingController', () => {
  it('computes kebutuhanModalKerja without needing financing assumptions', () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    expect(result.current.kebutuhanModalKerja).toBe(22_159_000);
    expect(result.current.bunga).toBeNull();
    expect(result.current.kasAkhirPascaPembiayaan).toBeNull();
  });

  it('computes bunga and arus kas pasca pembiayaan once assumptions exist', () => {
    vi.mocked(useFinancingAssumptions).mockReturnValue({
      assumptions: {
        id: 'financing-1',
        scenarioId: 'scenario-1',
        saldoKasAwal: 0,
        modalSendiri: 3_869_000,
        nilaiPinjaman: 15_000_000,
        bungaPerPeriode: 3,
        tanggalPencairan: '2026-08-01',
        tanggalPembayaran: '2026-12-01',
        biayaLain: 0,
      },
      loading: false,
      error: null,
      save,
      reload: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    expect(result.current.bunga).toBe(450_000);
    expect(result.current.kasAkhirPascaPembiayaan).toBe(22_891_000);
  });

  it('openDialog seeds the draft from existing assumptions, converting dates to month keys', () => {
    vi.mocked(useFinancingAssumptions).mockReturnValue({
      assumptions: {
        id: 'financing-1',
        scenarioId: 'scenario-1',
        saldoKasAwal: 0,
        modalSendiri: 3_869_000,
        nilaiPinjaman: 15_000_000,
        bungaPerPeriode: 3,
        tanggalPencairan: '2026-08-01',
        tanggalPembayaran: '2026-12-01',
        biayaLain: 0,
      },
      loading: false,
      error: null,
      save,
      reload: vi.fn(),
    });

    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());

    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.draft).toMatchObject({
      nilaiPinjaman: '15000000',
      bungaPerPeriode: '3',
      tanggalPencairan: '2026-08',
      tanggalPembayaran: '2026-12',
    });
  });

  it('rejects negative nilaiPinjaman on submit without calling save', async () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());
    act(() => result.current.updateDraftField('nilaiPinjaman', '-1000'));

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.saveError).toMatch(/tidak boleh negatif/i);
  });

  it('rejects tanggalPembayaran before tanggalPencairan', async () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());
    act(() => result.current.updateDraftField('nilaiPinjaman', '15000000'));
    act(() => result.current.updateDraftField('tanggalPencairan', '2026-12'));
    act(() => result.current.updateDraftField('tanggalPembayaran', '2026-08'));

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.saveError).toMatch(/sebelum tanggal pencairan/i);
  });

  it('submits a valid draft, converting month keys back to full dates, and closes the dialog', async () => {
    const { result } = renderHook(() =>
      useFinancingController({ scenarioId: 'scenario-1', arusKasBulanan }),
    );

    act(() => result.current.openDialog());
    act(() => result.current.updateDraftField('nilaiPinjaman', '15000000'));
    act(() => result.current.updateDraftField('bungaPerPeriode', '3'));
    act(() => result.current.updateDraftField('tanggalPencairan', '2026-08'));
    act(() => result.current.updateDraftField('tanggalPembayaran', '2026-12'));

    await act(async () => {
      await result.current.submitDraft();
    });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      tanggalPencairan: '2026-08-01',
      tanggalPembayaran: '2026-12-01',
    }));
    await waitFor(() => expect(result.current.dialogOpen).toBe(false));
  });
});
