import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent } from '@/lib/analytics/recordEvent';
import type { ApiTransaction } from '@/lib/api';

interface DbTransactionRow {
  id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string | null;
  project_id: string | null;
  rab_category_id: string | null;
  rab_item_id: string | null;
  volume: number | null;
  satuan: string | null;
  harga_satuan: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateTransactionPayload {
  jenis?: unknown;
  kategori?: unknown;
  nominal?: unknown;
  tanggal?: unknown;
  keterangan?: unknown;
  projectId?: unknown;
  rabCategoryId?: unknown;
  rabItemId?: unknown;
  volume?: unknown;
  satuan?: unknown;
  hargaSatuan?: unknown;
}

function mapTransactionRow(row: DbTransactionRow): ApiTransaction {
  return {
    _id: row.id,
    jenis: row.jenis,
    kategori: row.kategori,
    nominal: row.nominal,
    tanggal: row.tanggal,
    keterangan: row.keterangan ?? '',
    projectId: row.project_id,
    rabCategoryId: row.rab_category_id,
    rabItemId: row.rab_item_id,
    volume: row.volume,
    satuan: row.satuan,
    hargaSatuan: row.harga_satuan,
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

function parseCreatePayload(body: CreateTransactionPayload) {
  if (
    (body.jenis !== 'pengeluaran' && body.jenis !== 'pendapatan') ||
    typeof body.kategori !== 'string' || !body.kategori.trim() ||
    typeof body.nominal !== 'number' ||
    typeof body.tanggal !== 'string' || !body.tanggal.trim()
  ) {
    return null;
  }

  const insertPayload: Record<string, unknown> = {
    jenis: body.jenis,
    kategori: body.kategori.trim(),
    nominal: body.nominal,
    tanggal: body.tanggal.trim(),
    keterangan: typeof body.keterangan === 'string' ? body.keterangan : '',
  };
  if (typeof body.projectId === 'string') insertPayload.project_id = body.projectId;
  if (typeof body.rabCategoryId === 'string') insertPayload.rab_category_id = body.rabCategoryId;
  if (typeof body.rabItemId === 'string') insertPayload.rab_item_id = body.rabItemId;
  if (typeof body.volume === 'number') insertPayload.volume = body.volume;
  if (typeof body.satuan === 'string') insertPayload.satuan = body.satuan;
  if (typeof body.hargaSatuan === 'number') insertPayload.harga_satuan = body.hargaSatuan;

  return insertPayload;
}

export async function handleFinanceTransactionCreate(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payload = parseCreatePayload(await request.json());
    if (!payload) {
      return jsonNoStore({ success: false, message: 'Payload transaksi tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('transactions')
      .insert({ user_id: userId, ...payload })
      .select()
      .single();

    if (error) throw error;

    await recordEvent({
      userId,
      feature: 'keuangan',
      eventType: 'action',
      eventName: 'transaction_created',
    });

    return jsonNoStore({ success: true, data: mapTransactionRow(data as DbTransactionRow) });
  } catch (error) {
    console.error('[API Finance Transactions] POST Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menyimpan transaksi' }, { status: 500 });
  }
}
