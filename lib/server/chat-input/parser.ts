import type { ParseResult, StockOutCommand } from './types';

const HELP_TEXT = [
  'Format belum dikenali. Contoh perintah yang bisa digunakan:',
  '',
  '📤 Pengeluaran:',
  '  pengeluaran 50000 pupuk beli npk',
  '',
  '📥 Pemasukan:',
  '  pemasukan 750000 penjualan cabai',
  '',
  '📦 Stok Masuk:',
  '  stok masuk 50kg grade A modal 18000 jual 25000 gudang utama exp 2026-06-20',
  '',
  '📤 Stok Keluar:',
  '  stok keluar BATCH-001-A 20kg pasar lokal kirim pagi',
].join('\n');

// ─── Utilities ────────────────────────────────────────────────────────────────

function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function parseAmount(value: string): number | null {
  // Strip thousand-separator dots and any other non-digit chars except digits.
  const cleaned = value.replace(/\./g, '').replace(/[^\d]/g, '');
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseWeightKg(value: string): number | null {
  const match = value.match(/^(\d+(?:[.,]\d+)?)(?:\s?kg)?$/i);
  if (!match) return null;
  const weight = Number(match[1].replace(',', '.'));
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function normalizeDestination(input: string): StockOutCommand['tujuan'] {
  const value = input.toLowerCase();
  if (value.includes('distributor')) return 'Distributor';
  if (value.includes('restoran')) return 'Restoran';
  if (value.includes('pasar')) return 'Pasar Lokal';
  return 'Lainnya';
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseFinance(text: string): ParseResult | null {
  const match = text.match(/^(pengeluaran|pemasukan)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/i);
  if (!match) return null;

  const nominal = parseAmount(match[2]);
  if (!nominal) return { ok: false, message: 'Nominal harus berupa angka lebih dari 0.' };

  return {
    ok: true,
    command: {
      type: 'finance',
      jenis: match[1].toLowerCase() === 'pemasukan' ? 'pendapatan' : 'pengeluaran',
      nominal,
      kategori: match[3].toLowerCase(),
      keterangan: (match[4] ?? '').trim(),
    },
  };
}

function parseStockIn(text: string): ParseResult | null {
  const match = text.match(
    /^stok\s+masuk\s+(\S+)\s+grade\s+([abc])\s+modal\s+(\S+)\s+jual\s+(\S+)\s+(.+?)\s+exp\s+(\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/i,
  );
  if (!match) return null;

  const berat = parseWeightKg(match[1]);
  const hargaModal = parseAmount(match[3]);
  const hargaJual = parseAmount(match[4]);

  if (!berat || !hargaModal || !hargaJual) {
    return { ok: false, message: 'Berat, modal, dan harga jual harus berupa angka valid lebih dari 0.' };
  }

  const lokasiText = match[5].toLowerCase();
  const lokasiPenyimpanan = lokasiText.includes('cadangan') ? 'Gudang Cadangan' : 'Gudang Utama';

  return {
    ok: true,
    command: {
      type: 'stock_in',
      berat,
      grade: match[2].toUpperCase() as 'A' | 'B' | 'C',
      hargaModal,
      hargaJual,
      lokasiPenyimpanan,
      estimasiKadaluarsa: match[6],
      catatan: (match[7] ?? '').trim(),
    },
  };
}

function parseStockOut(text: string): ParseResult | null {
  // Pattern: stok keluar <BATCH_CODE> <weight>kg <destination...> [kirim|catatan <note>]
  const match = text.match(
    /^stok\s+keluar\s+(\S+)\s+(\S+)\s+(.+?)(?:\s+(?:kirim|catatan)\s+(.+))?$/i,
  );
  if (!match) return null;

  const berat = parseWeightKg(match[2]);
  if (!berat) return { ok: false, message: 'Berat stok keluar harus lebih dari 0 kg.' };

  // Remove trailing kirim/catatan suffix from destination string
  const destinationRaw = match[3].replace(/\s+(?:kirim|catatan)\s+.*$/i, '').trim();
  const tujuan = normalizeDestination(destinationRaw);

  return {
    ok: true,
    command: {
      type: 'stock_out',
      batchCode: match[1].toUpperCase(),
      berat,
      tujuan,
      catatan: (match[4] ?? '').trim(),
    },
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function parseChatInput(input: string): ParseResult {
  const text = normalizeText(input);
  if (!text) return { ok: false, message: HELP_TEXT };

  return (
    parseFinance(text) ??
    parseStockIn(text) ??
    parseStockOut(text) ?? { ok: false, message: HELP_TEXT }
  );
}
