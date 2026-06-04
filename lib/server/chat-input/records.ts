import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinanceCommand, StockInCommand, StockOutCommand } from './types';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function computeBatchStatus(
  stokTersisa: number,
  beratMasuk: number,
  estimasiKadaluarsa: string,
): 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis' {
  if (stokTersisa === 0) return 'habis';

  const now = new Date();
  const kadaluarsa = new Date(estimasiKadaluarsa);
  const daysLeft = Math.ceil((kadaluarsa.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export async function recordFinanceCommand(
  supabase: SupabaseClient,
  userId: string,
  command: FinanceCommand,
  now: Date,
): Promise<{ data: unknown; summary: string }> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      jenis: command.jenis,
      kategori: command.kategori,
      nominal: command.nominal,
      tanggal: toDateString(now),
      keterangan: command.keterangan,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const label = command.jenis === 'pendapatan' ? 'Pemasukan' : 'Pengeluaran';
  const kategoriLabel = command.kategori.charAt(0).toUpperCase() + command.kategori.slice(1);
  const keteranganPart = command.keterangan ? ` (${command.keterangan})` : '';

  return {
    data,
    summary: `✅ ${label} ${formatRupiah(command.nominal)} untuk ${kategoriLabel}${keteranganPart} berhasil dicatat.`,
  };
}

// ─── Stock In ─────────────────────────────────────────────────────────────────

export async function recordStockInCommand(
  supabase: SupabaseClient,
  userId: string,
  command: StockInCommand,
  now: Date,
): Promise<{ data: unknown; summary: string }> {
  // Generate unique batch code: count existing batches for this user to get sequence number.
  const { count } = await supabase
    .from('harvest_batches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const seq = String((count ?? 0) + 1).padStart(3, '0');
  const batchCode = `BATCH-${seq}-${command.grade}`;
  const status = computeBatchStatus(command.berat, command.berat, command.estimasiKadaluarsa);

  const { data: batch, error: batchError } = await supabase
    .from('harvest_batches')
    .insert({
      user_id: userId,
      batch_code: batchCode,
      tanggal_panen: toDateString(now),
      grade: command.grade,
      berat_masuk: command.berat,
      stok_tersisa: command.berat,
      harga_modal: command.hargaModal,
      harga_jual: command.hargaJual,
      lokasi_penyimpanan: command.lokasiPenyimpanan,
      estimasi_kadaluarsa: command.estimasiKadaluarsa,
      catatan: command.catatan,
      status,
    })
    .select()
    .single();

  if (batchError) throw new Error(batchError.message);

  const { error: mutationError } = await supabase
    .from('stock_mutations')
    .insert({
      user_id: userId,
      batch_id: (batch as any).id,
      batch_code: batchCode,
      tipe: 'masuk',
      berat: command.berat,
      tanggal: toDateString(now),
      catatan: command.catatan || 'Panen dicatat dari chat',
    });

  if (mutationError) throw new Error(mutationError.message);

  return {
    data: batch,
    summary: `✅ Stok masuk ${command.berat} kg grade ${command.grade} berhasil dicatat sebagai ${batchCode}.`,
  };
}

// ─── Stock Out ────────────────────────────────────────────────────────────────

export async function recordStockOutCommand(
  supabase: SupabaseClient,
  userId: string,
  command: StockOutCommand,
  now: Date,
): Promise<{ data: unknown; summary: string }> {
  // Fetch the batch and validate ownership + stock availability.
  const { data: batch, error: batchError } = await supabase
    .from('harvest_batches')
    .select('*')
    .eq('user_id', userId)
    .eq('batch_code', command.batchCode)
    .single();

  if (batchError || !batch) {
    throw new Error(`Batch ${command.batchCode} tidak ditemukan.`);
  }

  const stokTersisa = Number((batch as any).stok_tersisa);
  if (command.berat > stokTersisa) {
    throw new Error(`Stok tidak cukup. Tersisa: ${stokTersisa} kg.`);
  }

  const newStock = stokTersisa - command.berat;
  const newStatus = computeBatchStatus(
    newStock,
    Number((batch as any).berat_masuk),
    (batch as any).estimasi_kadaluarsa,
  );

  const { error: updateError } = await supabase
    .from('harvest_batches')
    .update({
      stok_tersisa: newStock,
      status: newStatus,
      updated_at: now.toISOString(),
    })
    .eq('id', (batch as any).id);

  if (updateError) throw new Error(updateError.message);

  const { data: mutation, error: mutationError } = await supabase
    .from('stock_mutations')
    .insert({
      user_id: userId,
      batch_id: (batch as any).id,
      batch_code: command.batchCode,
      tipe: 'keluar',
      berat: command.berat,
      tujuan: command.tujuan,
      tanggal: toDateString(now),
      catatan: command.catatan,
    })
    .select()
    .single();

  if (mutationError) throw new Error(mutationError.message);

  return {
    data: mutation,
    summary: `✅ Stok keluar ${command.berat} kg dari ${command.batchCode} ke ${command.tujuan} berhasil dicatat. Sisa stok: ${newStock} kg.`,
  };
}
