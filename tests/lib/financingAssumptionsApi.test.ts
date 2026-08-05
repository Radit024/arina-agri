import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from,
  },
}));

vi.mock('@/lib/devAuth', () => ({
  buildDevelopmentAccessToken: () => 'dev-token',
  readLocalDevelopmentUserId: () => null,
}));

const dbRow = {
  id: 'financing-1',
  scenario_id: 'scenario-1',
  saldo_kas_awal: 0,
  modal_sendiri: 3_869_000,
  nilai_pinjaman: 15_000_000,
  bunga_per_periode: 3,
  tanggal_pencairan: '2026-08-01',
  tanggal_pembayaran: '2026-12-01',
  biaya_lain: 0,
  updated_at: '2026-08-02T00:00:00.000Z',
};

describe('financingAssumptionsApi', () => {
  beforeEach(() => {
    from.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('getByScenario returns null when no row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { financingAssumptionsApi } = await import('@/lib/api');
    const result = await financingAssumptionsApi.getByScenario('scenario-1');

    expect(from).toHaveBeenCalledWith('financing_assumptions');
    expect(eq).toHaveBeenCalledWith('scenario_id', 'scenario-1');
    expect(result).toBeNull();
  });

  it('getByScenario maps an existing row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    const { financingAssumptionsApi } = await import('@/lib/api');
    const result = await financingAssumptionsApi.getByScenario('scenario-1');

    expect(result).toMatchObject({
      id: 'financing-1',
      scenarioId: 'scenario-1',
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      tanggalPencairan: '2026-08-01',
      tanggalPembayaran: '2026-12-01',
    });
  });

  it('upsert writes snake_case fields keyed by scenario_id', async () => {
    const single = vi.fn().mockResolvedValue({ data: dbRow, error: null });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    from.mockReturnValue({ upsert });

    const { financingAssumptionsApi } = await import('@/lib/api');
    const result = await financingAssumptionsApi.upsert('scenario-1', {
      saldoKasAwal: 0,
      modalSendiri: 3_869_000,
      nilaiPinjaman: 15_000_000,
      bungaPerPeriode: 3,
      tanggalPencairan: '2026-08-01',
      tanggalPembayaran: '2026-12-01',
      biayaLain: 0,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        scenario_id: 'scenario-1',
        nilai_pinjaman: 15_000_000,
        bunga_per_periode: 3,
        tanggal_pencairan: '2026-08-01',
        tanggal_pembayaran: '2026-12-01',
      }),
      { onConflict: 'scenario_id' },
    );
    expect(result.scenarioId).toBe('scenario-1');
  });
});
