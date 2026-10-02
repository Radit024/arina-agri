// Tipe yang dipakai seluruh aplikasi.
//
// Bentuk di sini adalah "public shape": field sudah diserialisasi ke
// camelCase dan null sudah dinormalkan, sehingga View dan controller tidak
// pernah menyentuh baris mentah Postgres.

import type { DbTransaction, DbHarvestBatch, DbStockMutation } from '@/lib/supabase';
import type {
  FinanceProject,
  FinanceScenarioEntity,
  FinancingAssumptions,
  ProductionSalesAssumptions,
  RabCategory,
  RabItem,
} from '@/lib/finance/rabTypes';
import type {
  BmkgWeatherWarning,
} from '@/lib/server/weather/bmkgTypes';

/** Amplop respons seragam dari semua route handler. */
export interface ApiEnvelope<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

/** Bentuk baris Postgres yang tidak diekspor client, hanya untuk mapper. */
export type DbStockMutationWithSale = DbStockMutation & {
  nama_pembeli?: string | null;
  harga_realisasi?: number | null;
};

export interface DbBuyer {
  id: string;
  nama: string;
  user_id: string;
  created_at: string;
}

export interface DbMasterDataRow {
  id: string;
  nama: string;
  urutan?: number | null;
}

export type DbTransactionUpdate = Partial<Pick<
  DbTransaction,
  | 'jenis'
  | 'kategori'
  | 'nominal'
  | 'tanggal'
  | 'keterangan'
  | 'project_id'
  | 'rab_category_id'
  | 'rab_item_id'
  | 'volume'
  | 'satuan'
  | 'harga_satuan'
  | 'updated_at'
>>;

export type DbHarvestBatchUpdate = Partial<Pick<
  DbHarvestBatch,
  | 'tanggal_panen'
  | 'grade'
  | 'berat_masuk'
  | 'stok_tersisa'
  | 'harga_modal'
  | 'harga_jual'
  | 'lokasi_penyimpanan'
  | 'estimasi_kadaluarsa'
  | 'catatan'
  | 'status'
  | 'updated_at'
>>;


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
  projectId?: string | null;
  rabCategoryId?: string | null;
  rabItemId?: string | null;
  volume?: number | null;
  satuan?: string | null;
  hargaSatuan?: number | null;
  scenarioId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApiFinanceScenario = FinanceScenarioEntity;

export type ApiFinancingAssumptions = FinancingAssumptions;

export type ApiProductionSalesAssumptions = ProductionSalesAssumptions;

export type ApiFinanceProject = FinanceProject;

export type ApiRabCategory = RabCategory;

export type ApiRabItem = RabItem;

export interface ApiTransactionCategory {
  id: string;
  nama: string;
}

export interface ApiRabImport {
  id: string;
  projectId: string;
  fileName: string;
  status: 'success' | 'failed';
  summary: string;
  errors: string[];
  createdAt: string;
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

export interface ApiSupplyItem {
  id: string;
  nama: string;
  kategori: 'bahan_pendukung' | 'alat';
  satuan: string;
  stokSaatIni: number;
  hargaBeliTerakhir: number | null;
  catatan: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSupplyMutation {
  id: string;
  itemId: string;
  tipe: 'masuk' | 'keluar' | 'distribusi';
  jumlah: number;
  hargaSatuan: number | null;
  tanggal: string;
  keterangan: string;
  linkedTransactionId: string | null;
  createdAt: string;
}

export interface NewSupplyItem {
  nama: string;
  kategori: 'bahan_pendukung' | 'alat';
  satuan: string;
  hargaBeliTerakhir?: number;
  catatan?: string;
}

export interface NewSupplyMutation {
  itemId: string;
  tipe: 'masuk' | 'keluar' | 'distribusi';
  jumlah: number;
  hargaSatuan?: number;
  tanggal: string;
  keterangan?: string;
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