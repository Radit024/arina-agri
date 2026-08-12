import { supabase } from '@/lib/supabase';
import { buildDevelopmentAccessToken, readLocalDevelopmentUserId } from '@/lib/devAuth';
import { computeStockBatchStatus as computeStatus } from '@/lib/stok/computeStatus';
import type {
  DbFinanceProject,
  DbFinanceScenario,
  DbFinancingAssumptions,
  DbHarvestBatch,
  DbProductionSalesAssumptions,
  DbRabCategory,
  DbRabImport,
  DbRabItem,
  DbStockMutation,
  DbTransaction,
  DbTransactionCategory,
  DbTransactionSatuan,
} from '@/lib/supabase';
import type {
  FinanceProject,
  FinanceScenarioEntity,
  FinanceTransactionForReport,
  FinancingAssumptions,
  ProductionSalesAssumptions,
  RabCategory,
  RabItem,
} from '@/lib/finance/rabTypes';
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

interface ApiEnvelope<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

// ─── Helpers to map Supabase rows → frontend shape ────────────────
type DbStockMutationWithSale = DbStockMutation & {
  nama_pembeli?: string | null;
  harga_realisasi?: number | null;
};

interface DbBuyer {
  id: string;
  nama: string;
  user_id: string;
  created_at: string;
}

interface DbMasterDataRow {
  id: string;
  nama: string;
  urutan?: number | null;
}

type DbTransactionUpdate = Partial<Pick<
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

type DbHarvestBatchUpdate = Partial<Pick<
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

function mapTx(row: DbTransaction): ApiTransaction {
  return {
    _id: row.id,
    jenis: row.jenis,
    kategori: row.kategori,
    nominal: row.nominal,
    tanggal: row.tanggal,
    keterangan: row.keterangan ?? '',
    projectId: row.project_id ?? null,
    rabCategoryId: row.rab_category_id ?? null,
    rabItemId: row.rab_item_id ?? null,
    volume: row.volume ?? null,
    satuan: row.satuan ?? null,
    hargaSatuan: row.harga_satuan ?? null,
    scenarioId: row.scenario_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFinanceScenario(row: DbFinanceScenario): FinanceScenarioEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    mode: row.mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFinancingAssumptions(row: DbFinancingAssumptions): FinancingAssumptions {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    saldoKasAwal: row.saldo_kas_awal,
    modalSendiri: row.modal_sendiri,
    nilaiPinjaman: row.nilai_pinjaman,
    bungaPerPeriode: row.bunga_per_periode,
    tanggalPencairan: row.tanggal_pencairan ?? '',
    tanggalPembayaran: row.tanggal_pembayaran ?? '',
    biayaLain: row.biaya_lain,
  };
}

function mapProductionSalesAssumptions(row: DbProductionSalesAssumptions): ProductionSalesAssumptions {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    produksi: Number(row.produksi ?? 0),
    satuan: row.satuan ?? 'kg',
    hargaJual: Number(row.harga_jual ?? 0),
  };
}

function mapFinanceProject(row: DbFinanceProject): ApiFinanceProject {
  return {
    id: row.id,
    name: row.name,
    commodity: row.commodity,
    landArea: row.land_area,
    landAreaUnit: row.land_area_unit,
    seasonLabel: row.season_label,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRabCategory(row: DbRabCategory): ApiRabCategory {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type,
    sortOrder: row.sort_order,
  };
}

function mapRabItem(row: DbRabItem, category?: ApiRabCategory): ApiRabItem {
  return {
    id: row.id,
    projectId: row.project_id,
    categoryId: row.category_id,
    categoryName: category?.name,
    type: row.type,
    name: row.name,
    volume: row.volume,
    unit: row.unit,
    unitPrice: row.unit_price,
    plannedTotal: row.planned_total,
    plannedCashMonth: row.planned_cash_month ?? undefined,
    aliases: row.aliases ?? [],
    sortOrder: row.sort_order,
  };
}

function mapRabImport(row: DbRabImport): ApiRabImport {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    status: row.status,
    summary: row.summary ?? '',
    errors: row.errors ?? [],
    createdAt: row.created_at,
  };
}

function mapBatch(row: DbHarvestBatch): ApiHarvestBatch {
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

function mapMutation(row: DbStockMutationWithSale): ApiStockMutation {
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

async function resolveCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const localUserId = readLocalDevelopmentUserId();
  if (localUserId) return { id: localUserId };

  return null;
}

async function buildCurrentAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }

  const localUserId = readLocalDevelopmentUserId();
  if (localUserId) {
    return { Authorization: `Bearer ${buildDevelopmentAccessToken(localUserId)}` };
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
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTx);
  },

  getByScenario: async (scenarioId: string): Promise<ApiTransaction[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('scenario_id', scenarioId)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTx);
  },

  createForScenario: async (
    payload: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'> & { scenarioId: string },
  ): Promise<ApiTransaction> => {
    return authenticatedJsonRequest<ApiTransaction>('/api/finance/transactions', {
      method: 'POST',
      body: { ...payload, scenario_id: payload.scenarioId },
    });
  },

  create: async (payload: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiTransaction> => {
    return authenticatedJsonRequest<ApiTransaction>('/api/finance/transactions', {
      method: 'POST',
      body: payload,
    });
  },

  update: async (id: string, payload: Partial<ApiTransaction>): Promise<ApiTransaction> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: DbTransactionUpdate = {};
    if (payload.jenis !== undefined) update.jenis = payload.jenis;
    if (payload.kategori !== undefined) update.kategori = payload.kategori;
    if (payload.nominal !== undefined) update.nominal = payload.nominal;
    if (payload.tanggal !== undefined) update.tanggal = payload.tanggal;
    if (payload.keterangan !== undefined) update.keterangan = payload.keterangan;
    if (payload.projectId !== undefined) update.project_id = payload.projectId;
    if (payload.rabCategoryId !== undefined) update.rab_category_id = payload.rabCategoryId;
    if (payload.rabItemId !== undefined) update.rab_item_id = payload.rabItemId;
    if (payload.volume !== undefined) update.volume = payload.volume;
    if (payload.satuan !== undefined) update.satuan = payload.satuan;
    if (payload.hargaSatuan !== undefined) update.harga_satuan = payload.hargaSatuan;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapTx(data);
  },

  delete: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },
};

// ─── Calendar Events API ──────────────────────────────────────────
export const financeProjectApi = {
  getAll: async (): Promise<ApiFinanceProject[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapFinanceProject(row as DbFinanceProject));
  },

  create: async (payload: Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiFinanceProject> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_projects')
      .insert({
        user_id: user.id,
        name: payload.name,
        commodity: payload.commodity,
        land_area: payload.landArea,
        land_area_unit: payload.landAreaUnit,
        season_label: payload.seasonLabel,
        start_date: payload.startDate,
        end_date: payload.endDate,
        status: payload.status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinanceProject(data as DbFinanceProject);
  },

  update: async (id: string, payload: Partial<ApiFinanceProject>): Promise<ApiFinanceProject> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.commodity !== undefined) update.commodity = payload.commodity;
    if (payload.landArea !== undefined) update.land_area = payload.landArea;
    if (payload.landAreaUnit !== undefined) update.land_area_unit = payload.landAreaUnit;
    if (payload.seasonLabel !== undefined) update.season_label = payload.seasonLabel;
    if (payload.startDate !== undefined) update.start_date = payload.startDate;
    if (payload.endDate !== undefined) update.end_date = payload.endDate;
    if (payload.status !== undefined) update.status = payload.status;

    const { data, error } = await supabase
      .from('finance_projects')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinanceProject(data as DbFinanceProject);
  },

  delete: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('finance_projects').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },
};

export const rabApi = {
  getByProject: async (projectId: string): Promise<{ categories: ApiRabCategory[]; items: ApiRabItem[]; imports: ApiRabImport[] }> => {
    const user = await resolveCurrentUser();
    if (!user) return { categories: [], items: [], imports: [] };
    const [categoryResult, itemResult, importResult] = await Promise.all([
      supabase.from('rab_categories').select('*').eq('project_id', projectId).eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('rab_items').select('*').eq('project_id', projectId).eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('rab_imports').select('*').eq('project_id', projectId).eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (categoryResult.error) throw new Error(categoryResult.error.message);
    if (itemResult.error) throw new Error(itemResult.error.message);
    if (importResult.error) throw new Error(importResult.error.message);

    const categories = (categoryResult.data ?? []).map((row) => mapRabCategory(row as DbRabCategory));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const items = (itemResult.data ?? []).map((row) => {
      const item = row as DbRabItem;
      return mapRabItem(item, categoriesById.get(item.category_id));
    });
    const imports = (importResult.data ?? []).map((row) => mapRabImport(row as DbRabImport));
    return { categories, items, imports };
  },

  getByScenario: async (scenarioId: string): Promise<{ categories: ApiRabCategory[]; items: ApiRabItem[]; imports: ApiRabImport[] }> => {
    const user = await resolveCurrentUser();
    if (!user) return { categories: [], items: [], imports: [] };
    // We need project_id for imports — get it from categories
    const [categoryResult, itemResult] = await Promise.all([
      supabase.from('rab_categories').select('*').eq('scenario_id', scenarioId).eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('rab_items').select('*').eq('scenario_id', scenarioId).eq('user_id', user.id).order('sort_order', { ascending: true }),
    ]);
    if (categoryResult.error) throw new Error(categoryResult.error.message);
    if (itemResult.error) throw new Error(itemResult.error.message);

    const categories = (categoryResult.data ?? []).map((row) => mapRabCategory(row as DbRabCategory));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const items = (itemResult.data ?? []).map((row) => {
      const item = row as DbRabItem;
      return mapRabItem(item, categoriesById.get(item.category_id));
    });
    return { categories, items, imports: [] };
  },

  createCategoryForScenario: async (payload: Omit<ApiRabCategory, 'id'> & { scenarioId: string }): Promise<ApiRabCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_categories')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        scenario_id: payload.scenarioId,
        name: payload.name,
        type: payload.type,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRabCategory(data as DbRabCategory);
  },

  createItemForScenario: async (payload: Omit<ApiRabItem, 'id'> & { scenarioId: string }): Promise<ApiRabItem> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_items')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        scenario_id: payload.scenarioId,
        category_id: payload.categoryId,
        name: payload.name,
        type: payload.type,
        volume: payload.volume,
        unit: payload.unit,
        unit_price: payload.unitPrice,
        planned_total: payload.plannedTotal,
        planned_cash_month: payload.plannedCashMonth ?? null,
        aliases: payload.aliases,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ...mapRabItem(data as DbRabItem), categoryName: payload.categoryName };
  },

  createCategory: async (payload: Omit<ApiRabCategory, 'id'>): Promise<ApiRabCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_categories')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        name: payload.name,
        type: payload.type,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRabCategory(data as DbRabCategory);
  },

  updateCategory: async (id: string, payload: Partial<ApiRabCategory>): Promise<ApiRabCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.type !== undefined) update.type = payload.type;
    if (payload.sortOrder !== undefined) update.sort_order = payload.sortOrder;
    const { data, error } = await supabase.from('rab_categories').update(update).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw new Error(error.message);
    return mapRabCategory(data as DbRabCategory);
  },

  deleteCategory: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('rab_categories').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },

  createItem: async (payload: Omit<ApiRabItem, 'id'>): Promise<ApiRabItem> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_items')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        category_id: payload.categoryId,
        name: payload.name,
        type: payload.type,
        volume: payload.volume,
        unit: payload.unit,
        unit_price: payload.unitPrice,
        planned_total: payload.plannedTotal,
        planned_cash_month: payload.plannedCashMonth ?? null,
        aliases: payload.aliases,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // rab_items has no category_name column, so mapRabItem only fills it in when
    // given the joined category row (see getByProject). The caller already knows
    // the category name here (it just resolved/created the category), so use that
    // instead of leaving it undefined until the next full reload.
    return { ...mapRabItem(data as DbRabItem), categoryName: payload.categoryName };
  },

  updateItem: async (id: string, payload: Partial<ApiRabItem>): Promise<ApiRabItem> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.categoryId !== undefined) update.category_id = payload.categoryId;
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.type !== undefined) update.type = payload.type;
    if (payload.volume !== undefined) update.volume = payload.volume;
    if (payload.unit !== undefined) update.unit = payload.unit;
    if (payload.unitPrice !== undefined) update.unit_price = payload.unitPrice;
    if (payload.plannedTotal !== undefined) update.planned_total = payload.plannedTotal;
    if (payload.plannedCashMonth !== undefined) update.planned_cash_month = payload.plannedCashMonth ?? null;
    if (payload.aliases !== undefined) update.aliases = payload.aliases;
    if (payload.sortOrder !== undefined) update.sort_order = payload.sortOrder;

    const { data, error } = await supabase.from('rab_items').update(update).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw new Error(error.message);
    // Same reasoning as createItem: rab_items has no category_name column, so use
    // whatever the caller already resolved instead of losing it until next reload.
    return { ...mapRabItem(data as DbRabItem), categoryName: payload.categoryName };
  },

  deleteItem: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('rab_items').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },

  recordImport: async (payload: Omit<ApiRabImport, 'id' | 'createdAt'>): Promise<ApiRabImport> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_imports')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        file_name: payload.fileName,
        status: payload.status,
        summary: payload.summary,
        errors: payload.errors,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRabImport(data as DbRabImport);
  },
};

// ─── Finance Scenario API ─────────────────────────────────────────
export const financeScenarioApi = {
  getOrCreateForProject: async (projectId: string): Promise<ApiFinanceScenario[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];

    // Fetch existing scenarios for this project
    const { data: existing, error: fetchError } = await supabase
      .from('finance_scenarios')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id);
    if (fetchError) throw new Error(fetchError.message);

    const existingModes = new Set((existing ?? []).map((row) => (row as DbFinanceScenario).mode));
    const modesToCreate: Array<'PROJECTION' | 'REALIZATION'> = (['PROJECTION', 'REALIZATION'] as const).filter(
      (mode) => !existingModes.has(mode),
    );

    if (modesToCreate.length > 0) {
      const inserts = modesToCreate.map((mode) => ({
        user_id: user.id,
        project_id: projectId,
        mode,
      }));
      const { error: insertError } = await supabase.from('finance_scenarios').insert(inserts);
      if (insertError) throw new Error(insertError.message);

      // Re-fetch after insert
      const { data: refreshed, error: refreshError } = await supabase
        .from('finance_scenarios')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      if (refreshError) throw new Error(refreshError.message);
      return (refreshed ?? []).map((row) => mapFinanceScenario(row as DbFinanceScenario));
    }

    return (existing ?? []).map((row) => mapFinanceScenario(row as DbFinanceScenario));
  },
};

// ─── Financing Assumptions API ─────────────────────────────────────
export const financingAssumptionsApi = {
  getByScenario: async (scenarioId: string): Promise<ApiFinancingAssumptions | null> => {
    if (scenarioId.startsWith('guest-')) return null;
    const user = await resolveCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('financing_assumptions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapFinancingAssumptions(data as DbFinancingAssumptions) : null;
  },

  upsert: async (
    scenarioId: string,
    payload: Omit<FinancingAssumptions, 'id' | 'scenarioId'>,
  ): Promise<ApiFinancingAssumptions> => {
    if (scenarioId.startsWith('guest-')) throw new Error('Fitur asumsi tidak tersedia di mode tamu');
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('financing_assumptions')
      .upsert(
        {
          scenario_id: scenarioId,
          saldo_kas_awal: payload.saldoKasAwal,
          modal_sendiri: payload.modalSendiri,
          nilai_pinjaman: payload.nilaiPinjaman,
          bunga_per_periode: payload.bungaPerPeriode,
          tanggal_pencairan: payload.tanggalPencairan || null,
          tanggal_pembayaran: payload.tanggalPembayaran || null,
          biaya_lain: payload.biayaLain,
        },
        { onConflict: 'scenario_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapFinancingAssumptions(data as DbFinancingAssumptions);
  },
};

export const productionSalesAssumptionsApi = {
  getByScenario: async (scenarioId: string): Promise<ApiProductionSalesAssumptions | null> => {
    if (scenarioId.startsWith('guest-')) return null;
    const user = await resolveCurrentUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('production_sales_assumptions')
      .select('*')
      .eq('scenario_id', scenarioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProductionSalesAssumptions(data as DbProductionSalesAssumptions) : null;
  },

  upsert: async (
    scenarioId: string,
    payload: Omit<ProductionSalesAssumptions, 'id' | 'scenarioId'>,
  ): Promise<ApiProductionSalesAssumptions> => {
    if (scenarioId.startsWith('guest-')) throw new Error('Fitur asumsi tidak tersedia di mode tamu');
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('production_sales_assumptions')
      .upsert(
        {
          scenario_id: scenarioId,
          produksi: payload.produksi,
          satuan: payload.satuan || 'kg',
          harga_jual: payload.hargaJual,
        },
        { onConflict: 'scenario_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapProductionSalesAssumptions(data as DbProductionSalesAssumptions);
  },
};

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
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('harvest_batches')
      .select('*')
      .eq('user_id', user.id)
      .order('tanggal_panen', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBatch);
  },

  getSummary: async (): Promise<StokSummary> => {
    const user = await resolveCurrentUser();
    if (!user) {
      return {
        totalStokSiapJual: 0,
        stokTerjualMingguIni: 0,
        estimasiNilaiStok: 0,
        batchHampirKadaluarsa: 0,
      };
    }
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const fromDate = oneWeekAgo.toISOString().split('T')[0];

    const [batchResult, mutResult] = await Promise.all([
      supabase.from('harvest_batches').select('*').eq('user_id', user.id),
      supabase
        .from('stock_mutations')
        .select('berat')
        .eq('user_id', user.id)
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
    const user = await resolveCurrentUser();
    if (!user) return [];
    let query = supabase
      .from('stock_mutations')
      .select('*, harvest_batches!inner(grade)')
      .eq('user_id', user.id)
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
    return authenticatedJsonRequest<ApiHarvestBatch>('/api/stok/batches', {
      method: 'POST',
      body: payload,
    });
  },

  update: async (id: string, payload: Partial<ApiHarvestBatch>): Promise<ApiHarvestBatch> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: DbHarvestBatchUpdate = {};
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
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapBatch(data);
  },

  closeBatch: async (id: string): Promise<ApiHarvestBatch> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('harvest_batches')
      .update({ status: 'habis', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapBatch(data);
  },

  stockOut: async (batchId: string, payload: { berat: number; tujuan: string; tanggal: string; catatan: string; namaPembeli?: string; hargaRealisasi?: number }): Promise<{ batch: ApiHarvestBatch; mutation: ApiStockMutation }> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');

    const { data: batchRow, error: fetchErr } = await supabase
      .from('harvest_batches').select('*').eq('id', batchId).eq('user_id', user.id).single();
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
      .eq('user_id', user.id)
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
    return (data ?? []).map((row: DbBuyer) => ({
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
    return (data ?? []).map((row: DbMasterDataRow) => ({ id: row.id, nama: row.nama, urutan: row.urutan ?? 0 }));
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
    return (data ?? []).map((row: DbMasterDataRow) => ({ id: row.id, nama: row.nama, urutan: row.urutan ?? 0 }));
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
    project?: FinanceProject | null;
    rabItems?: RabItem[];
    transactions: FinanceTransactionForReport[];
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

// ─── Transaction Category API ─────────────────────────────────────
export const transactionCategoryApi = {
  getAll: async (): Promise<ApiTransactionCategory[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbTransactionCategory) => ({ id: row.id, nama: row.nama }));
  },

  create: async (nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionCategory;
    return { id: row.id, nama: row.nama };
  },

  update: async (id: string, nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionCategory;
    return { id: row.id, nama: row.nama };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase
      .from('finance_transaction_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};

// ─── Transaction Satuan API ───────────────────────────────────────
export const transactionSatuanApi = {
  getAll: async (): Promise<ApiTransactionCategory[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbTransactionSatuan) => ({ id: row.id, nama: row.nama }));
  },

  create: async (nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionSatuan;
    return { id: row.id, nama: row.nama };
  },

  update: async (id: string, nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionSatuan;
    return { id: row.id, nama: row.nama };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase
      .from('finance_transaction_satuans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};

// ─── Migration API (Tahap 2 Roadmap) ──────────────────────────────
export const migrationApi = {
  autoMigrateLegacyRab: async (projectId: string, projectionScenarioId: string): Promise<number> => {
    const user = await resolveCurrentUser();
    if (!user) return 0;

    const { data: categoriesData, error: catError } = await supabase
      .from('rab_categories')
      .select('id')
      .eq('project_id', projectId)
      .is('scenario_id', null);
    if (catError) throw new Error(catError.message);

    const { data: itemsData, error: itemError } = await supabase
      .from('rab_items')
      .select('id')
      .eq('project_id', projectId)
      .is('scenario_id', null);
    if (itemError) throw new Error(itemError.message);

    const categories = (categoriesData ?? []) as Array<{ id: string }>;
    const items = (itemsData ?? []) as Array<{ id: string }>;

    if (categories.length === 0 && items.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    if (categories.length > 0) {
      const catIds = categories.map((c) => c.id);
      const { error: updCatError } = await supabase
        .from('rab_categories')
        .update({ scenario_id: projectionScenarioId })
        .in('id', catIds);
      if (updCatError) throw new Error(updCatError.message);
      updatedCount += categories.length;

      const catLogs = categories.map((c) => ({
        user_id: user.id,
        project_id: projectId,
        entity_type: 'rab_category' as const,
        entity_id: c.id,
        previous_scenario_id: null,
        new_scenario_id: projectionScenarioId,
        action: 'auto_migrate_rab' as const,
      }));
      await supabase.from('migration_audit_log').insert(catLogs);
    }

    if (items.length > 0) {
      const itemIds = items.map((i) => i.id);
      const { error: updItemError } = await supabase
        .from('rab_items')
        .update({ scenario_id: projectionScenarioId })
        .in('id', itemIds);
      if (updItemError) throw new Error(updItemError.message);
      updatedCount += items.length;

      const itemLogs = items.map((i) => ({
        user_id: user.id,
        project_id: projectId,
        entity_type: 'rab_item' as const,
        entity_id: i.id,
        previous_scenario_id: null,
        new_scenario_id: projectionScenarioId,
        action: 'auto_migrate_rab' as const,
      }));
      await supabase.from('migration_audit_log').insert(itemLogs);
    }

    return updatedCount;
  },

  getUnclassifiedTransactions: async (projectId: string): Promise<ApiTransaction[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('project_id', projectId)
      .is('scenario_id', null)
      .order('tanggal', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((t) => mapTx(t as DbTransaction));
  },

  classifyTransactions: async (
    projectId: string,
    transactionIds: string[],
    targetScenarioId: string,
  ): Promise<{ successCount: number; failCount: number }> => {
    const user = await resolveCurrentUser();
    if (!user || transactionIds.length === 0) return { successCount: 0, failCount: 0 };

    let successCount = 0;
    let failCount = 0;

    for (const txId of transactionIds) {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({ scenario_id: targetScenarioId })
          .eq('id', txId);
        if (error) throw new Error(error.message);

        await supabase.from('migration_audit_log').insert({
          user_id: user.id,
          project_id: projectId,
          entity_type: 'transaction',
          entity_id: txId,
          previous_scenario_id: null,
          new_scenario_id: targetScenarioId,
          action: 'classify_transaction',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    return { successCount, failCount };
  },

  unclassifyTransaction: async (
    projectId: string,
    transactionId: string,
    currentScenarioId: string,
  ): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from('transactions')
      .update({ scenario_id: null })
      .eq('id', transactionId);
    if (error) throw new Error(error.message);

    await supabase.from('migration_audit_log').insert({
      user_id: user.id,
      project_id: projectId,
      entity_type: 'transaction',
      entity_id: transactionId,
      previous_scenario_id: currentScenarioId,
      new_scenario_id: null,
      action: 'rollback_classification',
    });
  },
};
