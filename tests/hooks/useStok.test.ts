import { describe, it, expect } from 'vitest';
import { computeLocalSummary } from '@/hooks/useStok';
import type { ApiHarvestBatch } from '@/lib/api';

const mockBatch = (overrides: Partial<ApiHarvestBatch>): ApiHarvestBatch => ({
  _id: '1',
  batchCode: 'BATCH-001-A',
  tanggalPanen: '2026-04-12',
  grade: 'A',
  beratMasuk: 100,
  stokTersisa: 80,
  hargaModal: 15000,
  hargaJual: 45000,
  lokasiPenyimpanan: 'Gudang Utama',
  estimasiKadaluarsa: '2026-04-26',
  catatan: '',
  status: 'aman',
  createdAt: '2026-04-12T06:00:00Z',
  updatedAt: '2026-04-12T06:00:00Z',
  ...overrides,
});

describe('computeLocalSummary', () => {
  it('menghitung totalStokSiapJual hanya dari batch yang tidak habis', () => {
    const batches = [
      mockBatch({ _id: '1', stokTersisa: 80, status: 'aman' }),
      mockBatch({ _id: '2', stokTersisa: 50, status: 'menipis' }),
      mockBatch({ _id: '3', stokTersisa: 0, status: 'habis' }),
    ];
    const result = computeLocalSummary(batches);
    expect(result.totalStokSiapJual).toBe(130);
  });

  it('menghitung estimasiNilaiStok dengan benar', () => {
    const batches = [
      mockBatch({ _id: '1', stokTersisa: 100, hargaJual: 45000, status: 'aman' }),
      mockBatch({ _id: '2', stokTersisa: 50, hargaJual: 38000, status: 'menipis' }),
    ];
    const result = computeLocalSummary(batches);
    // 100 * 45000 + 50 * 38000 = 4.500.000 + 1.900.000 = 6.400.000
    expect(result.estimasiNilaiStok).toBe(6_400_000);
  });

  it('menghitung batchHampirKadaluarsa dengan benar', () => {
    const batches = [
      mockBatch({ _id: '1', status: 'aman' }),
      mockBatch({ _id: '2', status: 'hampir_kadaluarsa' }),
      mockBatch({ _id: '3', status: 'hampir_kadaluarsa' }),
    ];
    const result = computeLocalSummary(batches);
    expect(result.batchHampirKadaluarsa).toBe(2);
  });

  it('mengecualikan batch habis dari estimasiNilaiStok', () => {
    const batches = [
      mockBatch({ _id: '1', stokTersisa: 100, hargaJual: 45000, status: 'aman' }),
      mockBatch({ _id: '2', stokTersisa: 0, hargaJual: 45000, status: 'habis' }),
    ];
    const result = computeLocalSummary(batches);
    expect(result.estimasiNilaiStok).toBe(4_500_000);
  });

  it('mengembalikan semua 0 jika tidak ada batch', () => {
    const result = computeLocalSummary([]);
    expect(result.totalStokSiapJual).toBe(0);
    expect(result.estimasiNilaiStok).toBe(0);
    expect(result.batchHampirKadaluarsa).toBe(0);
  });
});
