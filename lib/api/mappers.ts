// Pemetaan baris Postgres menjadi bentuk frontend.

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
  DbTransaction,
} from '@/lib/supabase';
import type {
  FinanceScenarioEntity,
  FinancingAssumptions,
  ProductionSalesAssumptions,
} from '@/lib/finance/rabTypes';
import type {
  ApiTransaction,
  ApiFinanceProject,
  ApiRabCategory,
  ApiRabItem,
  ApiRabImport,
  ApiHarvestBatch,
  ApiStockMutation,
  DbStockMutationWithSale,
} from './types';

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
  const recomputedStatus = computeStatus(row.stok_tersisa, row.berat_masuk, row.estimasi_kadaluarsa);
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
    status: row.status === 'habis' ? 'habis' : recomputedStatus,
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

export {
  mapTx,
  mapFinanceScenario,
  mapFinancingAssumptions,
  mapProductionSalesAssumptions,
  mapFinanceProject,
  mapRabCategory,
  mapRabItem,
  mapRabImport,
  mapBatch,
  mapMutation,
};
