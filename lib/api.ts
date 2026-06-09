import { supabase } from '@/lib/supabase';
import { DEVELOPMENT_ACCESS_TOKEN, DEVELOPMENT_USER_ID } from '@/lib/devAuth';
import type {
  BmkgForecastResponse,
  BmkgWeatherWarning,
  BmkgWarningsResponse,
} from '@/lib/server/weather/bmkgTypes';

export type {
  BmkgForecastDay,
  BmkgForecastResponse,
  BmkgForecastSnapshot,
  BmkgWarningsResponse,
  BmkgWeatherCondition,
  BmkgWeatherWarning,
} from '@/lib/server/weather/bmkgTypes';

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
  grade: string;
  beratMasuk: number;
  stokTersisa: number;
  hargaModal: number;
  hargaJual: number;
  lokasiPenyimpanan: string;
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
  namaPembeli?: string;
  hargaRealisasi?: number;
}

export interface StokSummary {
  totalStokSiapJual: number;
  stokTerjualMingguIni: number;
  estimasiNilaiStok: number;
  batchHampirKadaluarsa: number;
}

export interface ApiBuyer {
  id: string;
  nama: string;
  userId: string;
  createdAt: string;
}

export interface ApiGrade {
  id: string;
  nama: string;
  urutan: number;
}

export interface ApiLocation {
  id: string;
  nama: string;
  urutan: number;
}

export interface GeminiChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface GeminiWeatherContextPayload {
  forecastSummary?: string;
  warningSummary?: string;
}

export interface LocationSearchResult {
  id: string;
  adm4: string;
  label: string;
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
}

export interface NotificationDecisionWeatherInput {
  kondisi: string;
  suhu: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  lokasi?: string;
}

export interface NotificationDecisionDailyEvent {
  title: string;
  time?: string;
  category?: string;
  note?: string;
}

export interface NotificationDecisionInput {
  platform: 'whatsapp' | 'telegram';
  to: string;
  recipientName?: string;
  notificationsEnabled?: boolean;
  weather: NotificationDecisionWeatherInput;
  metadata?: {
    source?: string;
    customMessage?: string;
    locale?: 'id' | 'en';
    dailyEvents?: NotificationDecisionDailyEvent[];
    forceSend?: boolean;
    bmkgWarnings?: BmkgWeatherWarning[];
  };
}

export interface NotificationDecisionResponse {
  sent: boolean;
  decision: {
    decisionId: string;
    shouldSend: boolean;
    riskScore: number;
    riskLevel: 'rendah' | 'sedang' | 'tinggi' | 'ekstrem';
    finalMessage: string;
    recommendations: string[];
    reason: string;
  };
}

export interface NotificationScheduleConfig {
  enabled: boolean;
  time: string; // HH:mm
  timezone?: string;
  platform: 'whatsapp' | 'telegram';
  to: string;
  recipientName?: string;
  customMessage?: string;
  weatherAdm4?: string;
  weatherLocationLabel?: string;
  userId?: string;
}

export interface ApiUserProfile {
  id: string;
  fullName: string;
  lokasi: string;
  komoditas: string;
  luasLahan: string;
  whatsappPhone: string;
  telegramUsername: string;
  telegramChatId: string;
  telegramContact: string;
}

export interface ApiUserProfileUpdate {
  fullName?: string;
  whatsappPhone?: string;
  telegramContact?: string;
}

interface ApiEnvelope<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
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
    namaPembeli: row.nama_pembeli ?? undefined,
    hargaRealisasi: row.harga_realisasi ?? undefined,
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

async function resolveCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    return { id: DEVELOPMENT_USER_ID };
  }

  return null;
}

async function buildCurrentAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  if (process.env.NODE_ENV === 'development') {
    return { Authorization: `Bearer ${DEVELOPMENT_ACCESS_TOKEN}` };
  }

  return {};
}

async function calendarEventRequest<T>(endpoint: string, init: { method: string; body?: object }): Promise<T> {
  const headers: Record<string, string> = {
    ...(await buildCurrentAuthHeaders()),
  };

  if (init.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const rawText = await response.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.message || rawText || `HTTP error ${response.status}`);
  }

  return json.data as T;
}

// ─── Transaction API ──────────────────────────────────────────────
async function authenticatedJsonRequest<T>(endpoint: string, init: { method: string; body?: object }): Promise<T> {
  const headers: Record<string, string> = {
    ...(await buildCurrentAuthHeaders()),
  };

  if (init.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const rawText = await response.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.message || rawText || `HTTP error ${response.status}`);
  }

  return json.data as T;
}

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
    const user = await resolveCurrentUser();
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
    return calendarEventRequest<ApiCalendarEvent[]>('/api/calendar/events', { method: 'GET' });
  },

  create: async (payload: Omit<ApiCalendarEvent, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiCalendarEvent> => {
    return calendarEventRequest<ApiCalendarEvent>('/api/calendar/events', { method: 'POST', body: payload });
  },

  update: async (id: string, payload: Partial<ApiCalendarEvent>): Promise<ApiCalendarEvent> => {
    return calendarEventRequest<ApiCalendarEvent>('/api/calendar/events', {
      method: 'PATCH',
      body: { id, ...payload },
    });
  },

  toggleComplete: async (id: string): Promise<ApiCalendarEvent> => {
    return calendarEventRequest<ApiCalendarEvent>('/api/calendar/events', {
      method: 'PATCH',
      body: { id, action: 'toggleComplete' },
    });
  },

  delete: async (id: string): Promise<null> => {
    return calendarEventRequest<null>(`/api/calendar/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

// ─── Stok Panen API ───────────────────────────────────────────────
export const profileApi = {
  get: async (): Promise<ApiUserProfile> => {
    return authenticatedJsonRequest<ApiUserProfile>('/api/profile', { method: 'GET' });
  },

  save: async (payload: ApiUserProfileUpdate): Promise<ApiUserProfile> => {
    return authenticatedJsonRequest<ApiUserProfile>('/api/profile', { method: 'PATCH', body: payload });
  },
};

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
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const fromDate = oneWeekAgo.toISOString().split('T')[0];

    const [batchResult, mutResult] = await Promise.all([
      supabase.from('harvest_batches').select('*'),
      supabase
        .from('stock_mutations')
        .select('berat')
        .eq('tipe', 'keluar')
        .gte('tanggal', fromDate),
    ]);

    if (batchResult.error) throw new Error(batchResult.error.message);
    if (mutResult.error) throw new Error(mutResult.error.message);

    const batches = (batchResult.data ?? []).map(mapBatch);
    const active = batches.filter(b => b.status !== 'habis');
    const stokTerjualMingguIni = (mutResult.data ?? []).reduce((sum, m) => sum + (m.berat ?? 0), 0);

    return {
      totalStokSiapJual: active.reduce((s, b) => s + b.stokTersisa, 0),
      stokTerjualMingguIni,
      estimasiNilaiStok: active.reduce((s, b) => s + b.stokTersisa * b.hargaJual, 0),
      batchHampirKadaluarsa: batches.filter(b => b.status === 'hampir_kadaluarsa').length,
    };
  },

  getMutations: async (params?: { grade?: string; from?: string; to?: string }): Promise<ApiStockMutation[]> => {
    let query = supabase
      .from('stock_mutations')
      .select('*, harvest_batches!inner(grade)')
      .order('tanggal', { ascending: false });
    if (params?.from) query = query.gte('tanggal', params.from);
    if (params?.to) query = query.lte('tanggal', params.to);
    if (params?.grade && params.grade !== 'semua') {
      query = query.eq('harvest_batches.grade', params.grade);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMutation);
  },

  create: async (payload: Omit<ApiHarvestBatch, '_id' | 'batchCode' | 'stokTersisa' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ApiHarvestBatch> => {
    const user = await resolveCurrentUser();
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
      catatan: 'Stok awal masuk gudang',
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

  closeBatch: async (id: string): Promise<ApiHarvestBatch> => {
    const { data, error } = await supabase
      .from('harvest_batches')
      .update({ status: 'habis', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapBatch(data);
  },

  stockOut: async (batchId: string, payload: { berat: number; tujuan: string; tanggal: string; catatan: string; namaPembeli?: string; hargaRealisasi?: number }): Promise<{ batch: ApiHarvestBatch; mutation: ApiStockMutation }> => {
    const user = await resolveCurrentUser();
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
        nama_pembeli: payload.namaPembeli ?? null,
        harga_realisasi: payload.hargaRealisasi ?? null,
      })
      .select()
      .single();
    if (mutErr) throw new Error(mutErr.message);

    return { batch: mapBatch(updatedBatch), mutation: mapMutation(mutationRow) };
  },
};

export const buyersApi = {
  getAll: async (): Promise<ApiBuyer[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('user_id', user.id)
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      nama: row.nama,
      userId: row.user_id,
      createdAt: row.created_at,
    }));
  },

  upsert: async (nama: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from('buyers')
      .upsert({ user_id: user.id, nama }, { onConflict: 'user_id,nama', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },
};

export const gradesApi = {
  getAll: async (): Promise<ApiGrade[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('stock_grades')
      .select('*')
      .eq('user_id', user.id)
      .order('urutan', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({ id: row.id, nama: row.nama, urutan: row.urutan ?? 0 }));
  },

  create: async (nama: string): Promise<ApiGrade> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('stock_grades')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  update: async (id: string, nama: string): Promise<ApiGrade> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('stock_grades')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data: gradeRow } = await supabase
      .from('stock_grades')
      .select('nama')
      .eq('id', id)
      .single();
    if (gradeRow) {
      const { count } = await supabase
        .from('harvest_batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('grade', gradeRow.nama)
        .neq('status', 'habis');
      if ((count ?? 0) > 0) {
        throw new Error(`Grade "${gradeRow.nama}" masih dipakai ${count} batch aktif. Tutup batch tersebut sebelum menghapus grade.`);
      }
    }
    const { error } = await supabase
      .from('stock_grades')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};

export const locationsApi = {
  getAll: async (): Promise<ApiLocation[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('user_id', user.id)
      .order('urutan', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({ id: row.id, nama: row.nama, urutan: row.urutan ?? 0 }));
  },

  create: async (nama: string): Promise<ApiLocation> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('storage_locations')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  update: async (id: string, nama: string): Promise<ApiLocation> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('storage_locations')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data: locRow } = await supabase
      .from('storage_locations')
      .select('nama')
      .eq('id', id)
      .single();
    if (locRow) {
      const { count } = await supabase
        .from('harvest_batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('lokasi_penyimpanan', locRow.nama)
        .neq('status', 'habis');
      if ((count ?? 0) > 0) {
        throw new Error(`Lokasi "${locRow.nama}" masih dipakai ${count} batch aktif. Tutup batch tersebut sebelum menghapus lokasi.`);
      }
    }
    const { error } = await supabase
      .from('storage_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};

function resolveApiUrl(path: string) {
  return path;
}

async function apiFetch<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(resolveApiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || rawText || `HTTP error ${res.status}`);
  }

  if (!json?.success) {
    throw new Error(json?.message || 'Permintaan API gagal.');
  }

  return json.data as T;
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(resolveApiUrl(endpoint));
  const rawText = await res.text();
  let json: ApiEnvelope<T> | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.message || rawText || `HTTP error ${res.status}`);
  }

  if (!json?.success) {
    throw new Error(json?.message || 'Permintaan API gagal.');
  }

  return json.data as T;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export const aiApi = {
  askGemini: (payload: { prompt: string; history?: GeminiChatMessage[]; userName?: string; weatherContext?: GeminiWeatherContextPayload }) =>
    apiFetch<{ reply: string; model: string }>('/api/ai/gemini', payload),

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
    apiFetch<{ analysis: string; model: string }>('/api/ai/financial-report', payload),
};

export const notificationApi = {
  decide: (payload: NotificationDecisionInput) =>
    apiFetch<NotificationDecisionResponse['decision']>('/api/notification/decide', payload),

  decideAndSend: (payload: NotificationDecisionInput) =>
    apiFetch<NotificationDecisionResponse>('/api/notification/decide-send', payload),
};

async function getNotificationSchedule(): Promise<NotificationScheduleConfig> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/notification/schedule', { headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP error ${res.status}`);
  return json.data as NotificationScheduleConfig;
}

export const notificationScheduleApi = {
  get: () => getNotificationSchedule(),
  set: async (payload: NotificationScheduleConfig) => {
    const headers = await buildAuthHeaders();
    return fetch('/api/notification/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    }).then((res) => res.json());
  },
};

export const weatherApi = {
  getForecast: (params: { adm4: string; locationLabel?: string }) => {
    const search = new URLSearchParams();
    search.set('adm4', params.adm4);
    if (params.locationLabel) search.set('locationLabel', params.locationLabel);
    const query = search.toString();
    return apiGet<BmkgForecastResponse>(`/api/weather/forecast?${query}`);
  },

  getWarnings: (params?: { province?: string; provinceName?: string }) => {
    const search = new URLSearchParams();
    if (params?.province) search.set('province', params.province);
    if (params?.provinceName) search.set('provinceName', params.provinceName);
    const query = search.toString();
    return apiGet<BmkgWarningsResponse>(`/api/weather/warnings${query ? `?${query}` : ''}`);
  },
};

export const locationApi = {
  search: (params: { query: string; limit?: number }) => {
    const search = new URLSearchParams();
    search.set('q', params.query);
    if (params.limit) search.set('limit', String(params.limit));
    return apiGet<LocationSearchResult[]>(`/api/location/search?${search.toString()}`);
  },
  reverse: (params: { lat: number; lon: number }) => {
    const search = new URLSearchParams();
    search.set('lat', String(params.lat));
    search.set('lon', String(params.lon));
    return apiGet<LocationSearchResult>(`/api/location/reverse?${search.toString()}`);
  },
};
