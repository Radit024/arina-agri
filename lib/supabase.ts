import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (process.env.NODE_ENV === 'development') {
  console.log('[Supabase Debug] URL:', supabaseUrl);
  console.log('[Supabase Debug] Key exists:', !!supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Database Types ───────────────────────────────────────────────
export interface DbTransaction {
  id: string;
  user_id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  tanggal: string;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export interface DbCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  category: 'pemupukan' | 'penyemprotan' | 'irigasi' | 'pemetikan' | 'lainnya';
  description: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbHarvestBatch {
  id: string;
  user_id: string;
  batch_code: string;
  tanggal_panen: string;
  grade: 'A' | 'B' | 'C';
  berat_masuk: number;
  stok_tersisa: number;
  harga_modal: number;
  harga_jual: number;
  lokasi_penyimpanan: string;
  estimasi_kadaluarsa: string;
  catatan: string;
  status: 'aman' | 'menipis' | 'hampir_kadaluarsa' | 'habis';
  created_at: string;
  updated_at: string;
}

export interface DbStockMutation {
  id: string;
  user_id: string;
  batch_id: string;
  batch_code: string;
  tipe: 'masuk' | 'keluar';
  berat: number;
  tujuan?: string;
  tanggal: string;
  catatan: string;
  created_at: string;
}
