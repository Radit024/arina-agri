import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent } from '@/lib/analytics/recordEvent';
import { computeStockBatchStatus } from '@/lib/stok/computeStatus';
import type { ApiHarvestBatch } from '@/lib/api';

interface DbHarvestBatchRow {
  id: string;
  batch_code: string;
  tanggal_panen: string;
  grade: string;
  berat_masuk: number;
  stok_tersisa: number;
  harga_modal: number;
  harga_jual: number;
  lokasi_penyimpanan: string;
  estimasi_kadaluarsa: string;
  catatan: string | null;
  status: ApiHarvestBatch['status'];
  created_at: string;
  updated_at: string;
}

interface CreateBatchPayload {
  tanggalPanen?: unknown;
  grade?: unknown;
  beratMasuk?: unknown;
  hargaModal?: unknown;
  hargaJual?: unknown;
  lokasiPenyimpanan?: unknown;
  estimasiKadaluarsa?: unknown;
  catatan?: unknown;
}

function mapBatchRow(row: DbHarvestBatchRow): ApiHarvestBatch {
  return {
    _id: row.id,
    batchCode: row.batch_code,
    tanggalPanen: row.tanggal_panen,
    grade: row.grade,
    beratMasuk: row.berat_masuk,
    stokTersisa: row.stok_tersisa,
    hargaModal: row.harga_modal,
    hargaJual: row.harga_jual,
    lokasiPenyimpanan: row.lokasi_penyimpanan,
    estimasiKadaluarsa: row.estimasi_kadaluarsa,
    catatan: row.catatan ?? '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init?.headers },
  });
}

function parseCreatePayload(body: CreateBatchPayload) {
  if (
    typeof body.tanggalPanen !== 'string' || !body.tanggalPanen.trim() ||
    typeof body.grade !== 'string' || !body.grade.trim() ||
    typeof body.beratMasuk !== 'number' || body.beratMasuk <= 0 ||
    typeof body.hargaModal !== 'number' ||
    typeof body.hargaJual !== 'number' ||
    typeof body.lokasiPenyimpanan !== 'string' || !body.lokasiPenyimpanan.trim() ||
    typeof body.estimasiKadaluarsa !== 'string' || !body.estimasiKadaluarsa.trim()
  ) {
    return null;
  }

  return {
    tanggalPanen: body.tanggalPanen.trim(),
    grade: body.grade.trim(),
    beratMasuk: body.beratMasuk,
    hargaModal: body.hargaModal,
    hargaJual: body.hargaJual,
    lokasiPenyimpanan: body.lokasiPenyimpanan.trim(),
    estimasiKadaluarsa: body.estimasiKadaluarsa.trim(),
    catatan: typeof body.catatan === 'string' ? body.catatan : '',
  };
}

export async function handleStokBatchCreate(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = parseCreatePayload(await request.json());
    if (!payload) {
      return jsonNoStore({ success: false, message: 'Payload batch tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { count } = await supabase
      .from('harvest_batches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    const batchCode = `BATCH-${String((count ?? 0) + 1).padStart(3, '0')}-${payload.grade}`;
    const status = computeStockBatchStatus(payload.beratMasuk, payload.beratMasuk, payload.estimasiKadaluarsa);

    const { data, error } = await supabase
      .from('harvest_batches')
      .insert({
        user_id: userId,
        batch_code: batchCode,
        tanggal_panen: payload.tanggalPanen,
        grade: payload.grade,
        berat_masuk: payload.beratMasuk,
        stok_tersisa: payload.beratMasuk,
        harga_modal: payload.hargaModal,
        harga_jual: payload.hargaJual,
        lokasi_penyimpanan: payload.lokasiPenyimpanan,
        estimasi_kadaluarsa: payload.estimasiKadaluarsa,
        catatan: payload.catatan,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('stock_mutations').insert({
      user_id: userId,
      batch_id: data.id,
      batch_code: batchCode,
      tipe: 'masuk',
      berat: payload.beratMasuk,
      tanggal: payload.tanggalPanen,
      catatan: 'Stok awal masuk gudang',
    });

    await recordEvent({
      userId,
      feature: 'stok',
      eventType: 'action',
      eventName: 'stock_entry_created',
    });

    return jsonNoStore({ success: true, data: mapBatchRow(data as DbHarvestBatchRow) });
  } catch (error) {
    console.error('[API Stok Batches] POST Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menyimpan batch stok' }, { status: 500 });
  }
}
