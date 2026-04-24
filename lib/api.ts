import { auth } from '@/lib/firebase';

// ─── API Base Configuration ───────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Generic fetcher with error handling ─────────────────────────
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options?.headers) {
    const incomingHeaders = new Headers(options.headers);
    incomingHeaders.forEach((value, key) => headers.set(key, value));
  }

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || `HTTP error ${res.status}`);
  }
  return json.data as T;
}

// ─── Types mirroring backend ──────────────────────────────────────
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

// ─── Transaction API ──────────────────────────────────────────────
export const transactionApi = {
  getAll: () => apiFetch<ApiTransaction[]>('/transactions'),

  create: (data: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<ApiTransaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<ApiTransaction>) =>
    apiFetch<ApiTransaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<null>(`/transactions/${id}`, { method: 'DELETE' }),
};

// ─── Stok Panen API ───────────────────────────────────────────────
export const stokApi = {
  getAll: () => apiFetch<ApiHarvestBatch[]>('/stok'),

  getSummary: () => apiFetch<StokSummary>('/stok/summary'),

  getMutations: (params?: { grade?: string; from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.grade && params.grade !== 'semua') query.set('grade', params.grade);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return apiFetch<ApiStockMutation[]>(`/stok/mutations?${query}`);
  },

  create: (data: Omit<ApiHarvestBatch, '_id' | 'batchCode' | 'stokTersisa' | 'status' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<ApiHarvestBatch>('/stok', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<ApiHarvestBatch>) =>
    apiFetch<ApiHarvestBatch>(`/stok/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<null>(`/stok/${id}`, { method: 'DELETE' }),

  stockOut: (batchId: string, data: { berat: number; tujuan: string; tanggal: string; catatan: string }) =>
    apiFetch<{ batch: ApiHarvestBatch; mutation: ApiStockMutation }>(`/stok/${batchId}/keluar`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const aiApi = {
  askGemini: (payload: { prompt: string; history?: GeminiChatMessage[] }) =>
    apiFetch<{ reply: string; model: string }>('/ai/gemini', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
