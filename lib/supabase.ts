import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (process.env.NODE_ENV === 'test' ? 'http://localhost:54321' : '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (process.env.NODE_ENV === 'test' ? 'test-anon-key' : '');

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
  project_id?: string | null;
  scenario_id?: string | null;
  rab_category_id?: string | null;
  rab_item_id?: string | null;
  volume?: number | null;
  satuan?: string | null;
  harga_satuan?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbFinanceProject {
  id: string;
  user_id: string;
  name: string;
  commodity: string;
  land_area: number;
  land_area_unit: string;
  season_label: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DbRabCategory {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  type: 'income' | 'expense';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbRabItem {
  id: string;
  user_id: string;
  project_id: string;
  category_id: string;
  name: string;
  type: 'income' | 'expense';
  volume: number;
  unit: string;
  unit_price: number;
  planned_total: number;
  planned_cash_month: string | null;
  aliases: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbRabImport {
  id: string;
  user_id: string;
  project_id: string;
  file_name: string;
  status: 'success' | 'failed';
  summary: string | null;
  errors: string[] | null;
  created_at: string;
}

export interface DbFinanceScenario {
  id: string;
  user_id: string;
  project_id: string;
  mode: 'PROJECTION' | 'REALIZATION';
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
  grade: string;
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

export interface DbSupplyItem {
  id: string;
  user_id: string;
  nama: string;
  kategori: 'bahan_pendukung' | 'alat';
  satuan: string;
  stok_saat_ini: number;
  harga_beli_terakhir: number | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSupplyMutation {
  id: string;
  user_id: string;
  item_id: string;
  tipe: 'masuk' | 'keluar' | 'distribusi';
  jumlah: number;
  harga_satuan: number | null;
  tanggal: string;
  keterangan: string | null;
  linked_transaction_id: string | null;
  created_at: string;
}

export interface DbTransactionCategory {
  id: string;
  user_id: string;
  nama: string;
  created_at: string;
}

export interface DbTransactionSatuan {
  id: string;
  user_id: string;
  nama: string;
  created_at: string;
}
