import type { ParseResult, StockOutCommand, UtilityCommand } from './types';

export const HELP_TEXT = [
  'Panduan Arina Agri Bot',
  '',
  'Keuangan:',
  '/pengeluaran 50000 pupuk beli npk',
  '/pemasukan 750000 penjualan cabai',
  '',
  'Stok:',
  '/stok_masuk 50kg A modal 18000 jual 25000 gudang utama exp 2026-06-20',
  '/stok_keluar BATCH-001-A 20kg pasar lokal kirim pagi',
  '',
  'Akun:',
  '/hubungkan',
  '/profil',
  '',
  'Ringkasan:',
  '/ringkasan',
  '/batch',
].join('\n');

export const WELCOME_TEXT = [
  'Halo! Selamat datang di Arina Agri Bot.',
  'Saya membantu mencatat keuangan dan stok panen langsung dari Telegram atau WhatsApp.',
  '',
  HELP_TEXT,
].join('\n');

const UNKNOWN_TEXT = ['Format belum dikenali.', '', HELP_TEXT].join('\n');

const UTILITY_COMMANDS = new Set<UtilityCommand['name']>([
  'start',
  'help',
  'hubungkan',
  'profil',
  'ringkasan',
  'batch',
  'batal',
]);

function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function commandName(token: string): string {
  return token.replace(/^\//, '').split('@')[0].toLowerCase();
}

function parseAmount(value: string): number | null {
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

function parseUtility(text: string): ParseResult | null {
  const firstToken = text.split(' ')[0];
  const name = commandName(firstToken);

  if (UTILITY_COMMANDS.has(name as UtilityCommand['name']) && text.split(' ').length === 1) {
    return {
      ok: true,
      command: { type: 'utility', name: name as UtilityCommand['name'] },
    };
  }

  return null;
}

function parseFinance(text: string): ParseResult | null {
  const match = text.match(/^\/?(pengeluaran|pemasukan)(?:@\w+)?\s+(\S+)\s+(\S+)(?:\s+(.*))?$/i);
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
  const naturalMatch = text.match(
    /^stok\s+masuk\s+(\S+)\s+grade\s+([abc])\s+modal\s+(\S+)\s+jual\s+(\S+)\s+(.+?)\s+exp\s+(\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/i,
  );

  const slashMatch = text.match(
    /^\/stok_masuk(?:@\w+)?\s+(\S+)\s+(?:grade\s+)?([abc])\s+modal\s+(\S+)\s+jual\s+(\S+)\s+(.+?)\s+exp\s+(\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/i,
  );

  const match = naturalMatch ?? slashMatch;
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
  const naturalMatch = text.match(
    /^stok\s+keluar\s+(\S+)\s+(\S+)\s+(.+?)(?:\s+(?:kirim|catatan)\s+(.+))?$/i,
  );

  const slashMatch = text.match(
    /^\/stok_keluar(?:@\w+)?\s+(\S+)\s+(\S+)\s+(.+?)(?:\s+(?:kirim|catatan)\s+(.+))?$/i,
  );

  const match = naturalMatch ?? slashMatch;
  if (!match) return null;

  const berat = parseWeightKg(match[2]);
  if (!berat) return { ok: false, message: 'Berat stok keluar harus lebih dari 0 kg.' };

  const destinationRaw = match[3].replace(/\s+(?:kirim|catatan)\s+.*$/i, '').trim();

  return {
    ok: true,
    command: {
      type: 'stock_out',
      batchCode: match[1].toUpperCase(),
      berat,
      tujuan: normalizeDestination(destinationRaw),
      catatan: (match[4] ?? '').trim(),
    },
  };
}

function commandSpecificHelp(text: string): ParseResult | null {
  const name = commandName(text.split(' ')[0]);
  const messages: Partial<Record<string, string>> = {
    pengeluaran: 'Format: /pengeluaran 50000 pupuk beli npk',
    pemasukan: 'Format: /pemasukan 750000 penjualan cabai',
    stok_masuk: 'Format: /stok_masuk 50kg A modal 18000 jual 25000 gudang utama exp 2026-06-20',
    stok_keluar: 'Format: /stok_keluar BATCH-001-A 20kg pasar lokal kirim pagi',
  };

  if (messages[name]) {
    return { ok: false, message: messages[name] };
  }

  return null;
}

export function parseChatInput(input: string): ParseResult {
  const text = normalizeText(input);
  if (!text) return { ok: false, message: HELP_TEXT };

  return (
    parseUtility(text) ??
    parseFinance(text) ??
    parseStockIn(text) ??
    parseStockOut(text) ??
    commandSpecificHelp(text) ??
    { ok: false, message: UNKNOWN_TEXT }
  );
}
