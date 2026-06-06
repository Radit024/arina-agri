import { describe, expect, it } from 'vitest';
import { parseChatInput } from '@/lib/server/chat-input/parser';

describe('parseChatInput', () => {
  // ─── Finance ────────────────────────────────────────────────────────────────

  it('parses finance expense (pengeluaran) commands', () => {
    expect(parseChatInput('pengeluaran 50000 pupuk beli npk')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pengeluaran',
        nominal: 50000,
        kategori: 'pupuk',
        keterangan: 'beli npk',
      },
    });
  });

  it('parses slash finance expense commands', () => {
    expect(parseChatInput('/pengeluaran 50000 pupuk beli npk')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pengeluaran',
        nominal: 50000,
        kategori: 'pupuk',
        keterangan: 'beli npk',
      },
    });
  });

  it('parses finance income (pemasukan) commands', () => {
    expect(parseChatInput('pemasukan 750000 penjualan cabai')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pendapatan',
        nominal: 750000,
        kategori: 'penjualan',
        keterangan: 'cabai',
      },
    });
  });

  it('parses slash finance income commands', () => {
    expect(parseChatInput('/pemasukan 750000 penjualan cabai')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pendapatan',
        nominal: 750000,
        kategori: 'penjualan',
        keterangan: 'cabai',
      },
    });
  });

  it('parses pengeluaran with no extra keterangan', () => {
    expect(parseChatInput('pengeluaran 20000 transport')).toEqual({
      ok: true,
      command: {
        type: 'finance',
        jenis: 'pengeluaran',
        nominal: 20000,
        kategori: 'transport',
        keterangan: '',
      },
    });
  });

  it('strips thousand-separator dots from finance nominal', () => {
    const result = parseChatInput('pengeluaran 1.500.000 gaji');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.command).toMatchObject({ nominal: 1500000 });
  });

  it('returns error for zero nominal in finance command', () => {
    const result = parseChatInput('pengeluaran 0 pupuk');
    expect(result.ok).toBe(false);
  });

  // ─── Stock In ───────────────────────────────────────────────────────────────

  it('parses stock-in commands fully', () => {
    expect(
      parseChatInput('stok masuk 50kg grade A modal 18000 jual 25000 gudang utama exp 2026-06-20'),
    ).toEqual({
      ok: true,
      command: {
        type: 'stock_in',
        berat: 50,
        grade: 'A',
        hargaModal: 18000,
        hargaJual: 25000,
        lokasiPenyimpanan: 'Gudang Utama',
        estimasiKadaluarsa: '2026-06-20',
        catatan: '',
      },
    });
  });

  it('parses slash stock-in commands with compact grade syntax', () => {
    expect(parseChatInput('/stok_masuk 50kg A modal 18000 jual 25000 gudang utama exp 2026-06-20')).toEqual({
      ok: true,
      command: {
        type: 'stock_in',
        berat: 50,
        grade: 'A',
        hargaModal: 18000,
        hargaJual: 25000,
        lokasiPenyimpanan: 'Gudang Utama',
        estimasiKadaluarsa: '2026-06-20',
        catatan: '',
      },
    });
  });

  it('parses stock-in with gudang cadangan', () => {
    const result = parseChatInput(
      'stok masuk 30kg grade B modal 12000 jual 20000 gudang cadangan exp 2026-07-01',
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.command.type === 'stock_in') {
      expect(result.command.lokasiPenyimpanan).toBe('Gudang Cadangan');
    }
  });

  it('parses stock-in with optional catatan at the end', () => {
    const result = parseChatInput(
      'stok masuk 20kg grade C modal 10000 jual 18000 gudang utama exp 2026-06-15 panen pagi',
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.command.type === 'stock_in') {
      expect(result.command.catatan).toBe('panen pagi');
    }
  });

  // ─── Stock Out ──────────────────────────────────────────────────────────────

  it('parses stock-out commands', () => {
    expect(parseChatInput('stok keluar BATCH-001-A 20kg pasar lokal kirim pagi')).toEqual({
      ok: true,
      command: {
        type: 'stock_out',
        batchCode: 'BATCH-001-A',
        berat: 20,
        tujuan: 'Pasar Lokal',
        catatan: 'pagi',
      },
    });
  });

  it('parses slash stock-out commands', () => {
    expect(parseChatInput('/stok_keluar BATCH-001-A 20kg pasar lokal kirim pagi')).toEqual({
      ok: true,
      command: {
        type: 'stock_out',
        batchCode: 'BATCH-001-A',
        berat: 20,
        tujuan: 'Pasar Lokal',
        catatan: 'pagi',
      },
    });
  });

  it('normalises tujuan distributor', () => {
    const result = parseChatInput('stok keluar BATCH-002-B 10kg distributor jakarta');
    expect(result.ok).toBe(true);
    if (result.ok && result.command.type === 'stock_out') {
      expect(result.command.tujuan).toBe('Distributor');
    }
  });

  it('returns tujuan Lainnya for unknown destinations', () => {
    const result = parseChatInput('stok keluar BATCH-003-A 5kg supermarket abc');
    expect(result.ok).toBe(true);
    if (result.ok && result.command.type === 'stock_out') {
      expect(result.command.tujuan).toBe('Lainnya');
    }
  });

  // ─── Invalid Input ──────────────────────────────────────────────────────────

  it('returns help text for unrecognised messages', () => {
    const result = parseChatInput('tolong catat sesuatu');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; message: string }).message).toContain('Format belum dikenali');
  });

  it('returns help text for empty string', () => {
    const result = parseChatInput('');
    expect(result.ok).toBe(false);
  });

  it('is case-insensitive for command keywords', () => {
    const result = parseChatInput('PENGELUARAN 50000 pupuk beli npk');
    expect(result.ok).toBe(true);
  });

  it('handles extra whitespace between tokens', () => {
    const result = parseChatInput('pengeluaran  50000   pupuk  beli npk');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.command).toMatchObject({ nominal: 50000 });
  });

  it('returns utility commands for bot command menu actions', () => {
    const startResult = parseChatInput('/start');
    expect(startResult).toEqual({ ok: true, command: { type: 'utility', name: 'start' } });

    const helpResult = parseChatInput('help');
    expect(helpResult).toEqual({ ok: true, command: { type: 'utility', name: 'help' } });

    expect(parseChatInput('/hubungkan')).toEqual({ ok: true, command: { type: 'utility', name: 'hubungkan' } });
    expect(parseChatInput('/profil')).toEqual({ ok: true, command: { type: 'utility', name: 'profil' } });
    expect(parseChatInput('/ringkasan')).toEqual({ ok: true, command: { type: 'utility', name: 'ringkasan' } });
    expect(parseChatInput('/batch')).toEqual({ ok: true, command: { type: 'utility', name: 'batch' } });
    expect(parseChatInput('/briefing')).toEqual({ ok: true, command: { type: 'utility', name: 'briefing', args: '' } });
  });

  it('parses briefing with arguments', () => {
    expect(parseChatInput('/briefing hari ini')).toEqual({ ok: true, command: { type: 'utility', name: 'briefing', args: 'hari ini' } });
    expect(parseChatInput('/briefing MINGGU inI')).toEqual({ ok: true, command: { type: 'utility', name: 'briefing', args: 'minggu ini' } });
  });

  it('rejects briefing with invalid arguments', () => {
    const result = parseChatInput('/briefing besok');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Format briefing tidak dikenali');
    }
  });

  it('parses finance category management commands', () => {
    expect(parseChatInput('/kategori pengeluaran')).toEqual({
      ok: true,
      command: { type: 'category_list', jenis: 'pengeluaran' },
    });

    expect(parseChatInput('/kategori_tambah pengeluaran Transport alias bensin,ongkir,kirim')).toEqual({
      ok: true,
      command: {
        type: 'category_create',
        jenis: 'pengeluaran',
        name: 'Transport',
        aliases: ['bensin', 'ongkir', 'kirim'],
      },
    });

    expect(parseChatInput('/kategori_alias pengeluaran Pupuk alias npk,urea')).toEqual({
      ok: true,
      command: {
        type: 'category_alias',
        jenis: 'pengeluaran',
        name: 'Pupuk',
        aliases: ['npk', 'urea'],
      },
    });
  });
});
