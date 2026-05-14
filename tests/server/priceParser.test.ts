import { describe, expect, it } from 'vitest';
import { parsePriceLine, parseSiskaperbapoMapResponse } from '@/lib/server/prices/scraper';

describe('parsePriceLine', () => {
  it('parses location and price', () => {
    const parsed = parsePriceLine('Kabupaten Malang: Rp 65.000');
    expect(parsed).toEqual({ location: 'Kabupaten Malang', price: 65000 });
  });

  it('returns null on invalid input', () => {
    expect(parsePriceLine('Tidak ada data')).toBe(null);
  });
});

describe('parseSiskaperbapoMapResponse', () => {
  it('maps regional prices and official provincial average', () => {
    const rows = parseSiskaperbapoMapResponse({
      tanggal: '2026-05-14 20:19:29',
      avg: 67579,
      data: {
        malangkab: { nama: 'Kabupaten Malang', hrg: 62000 },
        probolinggokota: { nama: 'Kota Probolinggo', hrg: '75000' },
      },
    }, '2026-05-14');

    expect(rows).toEqual([
      { date: '2026-05-14', commodity: 'Cabe Rawit Merah', location: 'Kabupaten Malang', price: 62000 },
      { date: '2026-05-14', commodity: 'Cabe Rawit Merah', location: 'Kota Probolinggo', price: 75000 },
      { date: '2026-05-14', commodity: 'Cabe Rawit Merah', location: 'Jawa Timur', price: 67579 },
    ]);
  });
});
