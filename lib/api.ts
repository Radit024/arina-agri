import { supabase } from '@/lib/supabase';

// ─── Frontend-facing Types (keeping same shape as before) ─────────
export interface ApiTransaction {
  _id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCalendarEvent {
  _id: string;
  judul: string;
  tanggal: string;
  jenis: 'pemupukan' | 'penyemprotan' | 'irigasi' | 'pemetikan' | 'lainnya';
  waktu?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHarvestBatch {
  _id: string;
  batchCode: string;
  tanggalPanen: string;
  grade: 'A' | 'B' | 'C';
  beratMasuk: number;
  stokTersisa: number;
  hargaModal: number;
  hargaJual: number;
  lokasiPenyimpanan: 'Gudang Utama' | 'Gudang Cadangan';
  estimasiKadaluarsa: string;
  catatan: string;
  status: 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';
  createdAt: string;
  updatedAt: string;
}

export interface ApiStockMutation {
  _id: string;
  batchId: string;
  batchCode: string;
  tipe: 'masuk' | 'keluar';
  berat: number;
  tujuan?: string;
  tanggal: string;
  catatan: string;
  createdAt: string;
}

export interface StokSummary {
  totalStokSiapJual: number;
  stokTerjualMingguIni: number;
  estimasiNilaiStok: number;
  batchHampirKadaluarsa: number;
}

export interface GeminiChatMessage {
  role: 'user' | 'ai';
  content: string;
}

// ─── Helpers to map Supabase rows → frontend shape ────────────────
function mapTx(row: any): ApiTransaction {
  return {
    _id: row.id,
    jenis: row.jenis,
    kategori: row.kategori,
    nominal: row.nominal,
    tanggal: row.tanggal,
    keterangan: row.keterangan ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: any): ApiCalendarEvent {
  return {
    _id: row.id,
    judul: row.title,
    tanggal: row.date,
    jenis: row.category,
    waktu: row.waktu ?? '',
    catatan: row.description ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBatch(row: any): ApiHarvestBatch {
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

function mapMutation(row: any): ApiStockMutation {
  return {
    _id: row.id,
    batchId: row.batch_id,
    batchCode: row.batch_code,
    tipe: row.tipe,
    berat: row.berat,
    tujuan: row.tujuan,
    tanggal: row.tanggal,
    catatan: row.catatan ?? '',
    createdAt: row.created_at,
  };
}

function computeStatus(stokTersisa: number, beratMasuk: number, estimasiKadaluarsa: string): ApiHarvestBatch['status'] {
  const now = new Date();
  const kadaluarsa = new Date(estimasiKadaluarsa);
  const daysLeft = Math.ceil((kadaluarsa.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (stokTersisa === 0) return 'habis';
  if (daysLeft <= 3) return 'hampir_kadaluarsa';
  if (stokTersisa < beratMasuk * 0.2) return 'menipis';
  return 'aman';
}

// ─── Transaction API ──────────────────────────────────────────────
export const transactionApi = {
  getAll: async (): Promise<ApiTransaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTx);
  },

  create: async (payload: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiTransaction> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        jenis: payload.jenis,
        kategori: payload.kategori,
        nominal: payload.nominal,
        tanggal: payload.tanggal,
        keterangan: payload.keterangan ?? '',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapTx(data);
  },

  update: async (id: string, payload: Partial<ApiTransaction>): Promise<ApiTransaction> => {
    const update: any = {};
    if (payload.jenis !== undefined) update.jenis = payload.jenis;
    if (payload.kategori !== undefined) update.kategori = payload.kategori;
    if (payload.nominal !== undefined) update.nominal = payload.nominal;
    if (payload.tanggal !== undefined) update.tanggal = payload.tanggal;
    if (payload.keterangan !== undefined) update.keterangan = payload.keterangan;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapTx(data);
  },

  delete: async (id: string): Promise<null> => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return null;
  },
};

// ─── Calendar Events API ──────────────────────────────────────────
export const eventApi = {
  getAll: async (): Promise<ApiCalendarEvent[]> => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapEvent);
  },

  create: async (payload: Omit<ApiCalendarEvent, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiCalendarEvent> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title: payload.judul,
        date: payload.tanggal,
        category: payload.jenis,
        description: payload.catatan ?? '',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapEvent(data);
  },

  update: async (id: string, payload: Partial<ApiCalendarEvent>): Promise<ApiCalendarEvent> => {
    const update: any = {};
    if (payload.judul !== undefined) update.title = payload.judul;
    if (payload.tanggal !== undefined) update.date = payload.tanggal;
    if (payload.jenis !== undefined) update.category = payload.jenis;
    if (payload.catatan !== undefined) update.description = payload.catatan;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapEvent(data);
  },

  toggleComplete: async (id: string): Promise<ApiCalendarEvent> => {
    const { data: current, error: fetchErr } = await supabase
      .from('calendar_events').select('completed').eq('id', id).single();
    if (fetchErr) throw new Error(fetchErr.message);
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ completed: !current.completed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapEvent(data);
  },

  delete: async (id: string): Promise<null> => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return null;
  },
};

// ─── Stok Panen API ───────────────────────────────────────────────
export const stokApi = {
  getAll: async (): Promise<ApiHarvestBatch[]> => {
    const { data, error } = await supabase
      .from('harvest_batches')
      .select('*')
      .order('tanggal_panen', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBatch);
  },

  getSummary: async (): Promise<StokSummary> => {
    const { data, error } = await supabase.from('harvest_batches').select('*');
    if (error) throw new Error(error.message);
    const batches = (data ?? []).map(mapBatch);
    const active = batches.filter(b => b.status !== 'habis');
    return {
      totalStokSiapJual: active.reduce((s, b) => s + b.stokTersisa, 0),
      stokTerjualMingguIni: 0,
      estimasiNilaiStok: active.reduce((s, b) => s + b.stokTersisa * b.hargaJual, 0),
      batchHampirKadaluarsa: batches.filter(b => b.status === 'hampir_kadaluarsa').length,
    };
  },

  getMutations: async (params?: { grade?: string; from?: string; to?: string }): Promise<ApiStockMutation[]> => {
    let query = supabase.from('stock_mutations').select('*').order('tanggal', { ascending: false });
    if (params?.from) query = query.gte('tanggal', params.from);
    if (params?.to) query = query.lte('tanggal', params.to);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMutation);
  },

  create: async (payload: Omit<ApiHarvestBatch, '_id' | 'batchCode' | 'stokTersisa' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ApiHarvestBatch> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Belum login');

    const { count } = await supabase.from('harvest_batches').select('*', { count: 'exact', head: true });
    const batchCode = `BATCH-${String((count ?? 0) + 1).padStart(3, '0')}-${payload.grade}`;
    const status = computeStatus(payload.beratMasuk, payload.beratMasuk, payload.estimasiKadaluarsa);

    const { data, error } = await supabase
      .from('harvest_batches')
      .insert({
        user_id: user.id,
        batch_code: batchCode,
        tanggal_panen: payload.tanggalPanen,
        grade: payload.grade,
        berat_masuk: payload.beratMasuk,
        stok_tersisa: payload.beratMasuk,
        harga_modal: payload.hargaModal,
        harga_jual: payload.hargaJual,
        lokasi_penyimpanan: payload.lokasiPenyimpanan,
        estimasi_kadaluarsa: payload.estimasiKadaluarsa,
        catatan: payload.catatan ?? '',
        status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Record stock-in mutation
    await supabase.from('stock_mutations').insert({
      user_id: user.id,
      batch_id: data.id,
      batch_code: batchCode,
      tipe: 'masuk',
      berat: payload.beratMasuk,
      tanggal: payload.tanggalPanen,
      catatan: 'Panen awal masuk gudang',
    });

    return mapBatch(data);
  },

  update: async (id: string, payload: Partial<ApiHarvestBatch>): Promise<ApiHarvestBatch> => {
    const update: any = {};
    if (payload.tanggalPanen !== undefined) update.tanggal_panen = payload.tanggalPanen;
    if (payload.grade !== undefined) update.grade = payload.grade;
    if (payload.beratMasuk !== undefined) update.berat_masuk = payload.beratMasuk;
    if (payload.stokTersisa !== undefined) update.stok_tersisa = payload.stokTersisa;
    if (payload.hargaModal !== undefined) update.harga_modal = payload.hargaModal;
    if (payload.hargaJual !== undefined) update.harga_jual = payload.hargaJual;
    if (payload.lokasiPenyimpanan !== undefined) update.lokasi_penyimpanan = payload.lokasiPenyimpanan;
    if (payload.estimasiKadaluarsa !== undefined) update.estimasi_kadaluarsa = payload.estimasiKadaluarsa;
    if (payload.catatan !== undefined) update.catatan = payload.catatan;
    if (payload.status !== undefined) update.status = payload.status;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('harvest_batches')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapBatch(data);
  },

  delete: async (id: string): Promise<null> => {
    const { error } = await supabase.from('harvest_batches').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return null;
  },

  stockOut: async (batchId: string, payload: { berat: number; tujuan: string; tanggal: string; catatan: string }): Promise<{ batch: ApiHarvestBatch; mutation: ApiStockMutation }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Belum login');

    const { data: batchRow, error: fetchErr } = await supabase
      .from('harvest_batches').select('*').eq('id', batchId).single();
    if (fetchErr) throw new Error(fetchErr.message);
    const batch = mapBatch(batchRow);

    if (payload.berat > batch.stokTersisa) {
      throw new Error(`Stok tidak cukup. Tersisa: ${batch.stokTersisa} kg`);
    }

    const newStok = batch.stokTersisa - payload.berat;
    const newStatus = computeStatus(newStok, batch.beratMasuk, batch.estimasiKadaluarsa);

    const { data: updatedBatch, error: updateErr } = await supabase
      .from('harvest_batches')
      .update({ stok_tersisa: newStok, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', batchId)
      .select()
      .single();
    if (updateErr) throw new Error(updateErr.message);

    const { data: mutationRow, error: mutErr } = await supabase
      .from('stock_mutations')
      .insert({
        user_id: user.id,
        batch_id: batchId,
        batch_code: batch.batchCode,
        tipe: 'keluar',
        berat: payload.berat,
        tujuan: payload.tujuan,
        tanggal: payload.tanggal,
        catatan: payload.catatan,
      })
      .select()
      .single();
    if (mutErr) throw new Error(mutErr.message);

    return { batch: mapBatch(updatedBatch), mutation: mapMutation(mutationRow) };
  },
};

// ─── AI API — masih pakai Express backend ─────────────────────────
const AI_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function aiFetch<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${AI_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP error ${res.status}`);
  return json.data as T;
}

export const aiApi = {
  askGemini: (payload: { prompt: string; history?: GeminiChatMessage[]; userName?: string; }) =>
    aiFetch<{ reply: string; model: string }>('/ai/gemini', payload),

  generateFinancialReport: (payload: {
    periode: string;
    totalPendapatan: number;
    totalPengeluaran: number;
    labaBersih: number;
    userName?: string;
    transactions: Array<{
      jenis: string;
      kategori: string;
      nominal: number;
      tanggal: string;
      keterangan?: string;
    }>;
  }) =>
    aiFetch<{ analysis: string; model: string }>('/ai/financial-report', payload),
};
