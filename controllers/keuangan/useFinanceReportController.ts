'use client';

import { useMemo } from 'react';

import {
  computeLabaRugi,
  computeArusKasBulanan,
  computeHpp,
  computeBepProduksi,
  computeBcRatio,
  computeKelayakanStatus,
  computePenerimaan,
  computeKeuntungan,
} from '@/lib/finance/scenarioCalculations';
import type { ApiFinanceProject, ApiTransaction } from '@/lib/api';
import type {
  ArusKasBulanan,
  FinanceTransactionForReport,
  ProductionSalesAssumptions,
  RabItem,
} from '@/lib/finance/rabTypes';
import {
  buildIncomeStatementWorksheetData,
  type IncomeStatementWorksheetData,
} from '@/lib/finance/incomeStatementWorksheet';

export type KelayakanUsahaOutput = {
  totalBiayaProduksi: number;
  produksi: number | null;
  satuan: string;
  hargaJual: number | null;
  penerimaan: number | null;
  hpp: number | null;
  bepProduksi: number | null;
  bcRatio: number | null;
  kelayakanStatus: 'untung' | 'impas' | 'rugi' | null;
};

function toMonthKey(date: string) {
  return date.slice(0, 7);
}

export function transactionToReport(transaction: ApiTransaction): FinanceTransactionForReport {
  return {
    id: transaction._id,
    jenis: transaction.jenis,
    kategori: transaction.kategori,
    nominal: transaction.nominal,
    tanggal: transaction.tanggal,
    keterangan: transaction.keterangan,
    projectId: transaction.projectId,
    rabCategoryId: transaction.rabCategoryId,
    rabItemId: transaction.rabItemId,
    volume: transaction.volume,
    satuan: transaction.satuan,
    hargaSatuan: transaction.hargaSatuan,
  };
}

export function resolveReportRange(project: ApiFinanceProject | null, rabItems: RabItem[], transactions: ApiTransaction[]) {
  const startCandidates = [
    project?.startDate ? toMonthKey(project.startDate) : null,
    ...rabItems.map((item) => item.plannedCashMonth ?? null),
    ...transactions.map((transaction) => toMonthKey(transaction.tanggal)),
  ].filter(Boolean) as string[];
  const endCandidates = [
    project?.endDate ? toMonthKey(project.endDate) : null,
    ...rabItems.map((item) => item.plannedCashMonth ?? null),
    ...transactions.map((transaction) => toMonthKey(transaction.tanggal)),
  ].filter(Boolean) as string[];

  const now = new Date().toISOString().slice(0, 7);
  return {
    startMonth: startCandidates.sort()[0] ?? now,
    endMonth: endCandidates.sort().at(-1) ?? now,
  };
}

export function useFinanceReportController({
  project,
  rabItems,
  transactions,
  productionSalesAssumptions,
}: {
  project: ApiFinanceProject | null;
  rabItems: RabItem[];
  transactions: ApiTransaction[];
  productionSalesAssumptions?: ProductionSalesAssumptions | null;
}) {
  return useMemo(() => {
    // transactions are already scenario-scoped from useTransactionsForScenario,
    // but keep a project filter as a safety net for legacy data paths.
    const filteredTransactions = project
      ? transactions.filter((transaction) => !transaction.projectId || transaction.projectId === project.id)
      : transactions;
    const reportTransactions = filteredTransactions.map(transactionToReport);
    const { startMonth, endMonth } = resolveReportRange(project, rabItems, filteredTransactions);

    const labaRugi = computeLabaRugi(reportTransactions);
    const arusKasBulanan: ArusKasBulanan[] = computeArusKasBulanan(reportTransactions, startMonth, endMonth);

    const totalBiayaProduksi = labaRugi.totalPengeluaran;
    const produksi = productionSalesAssumptions?.produksi ?? null;
    const satuan = productionSalesAssumptions?.satuan || 'kg';
    const hargaJual = productionSalesAssumptions?.hargaJual ?? null;

    const penerimaan =
      produksi !== null && hargaJual !== null && produksi >= 0 && hargaJual >= 0
        ? computePenerimaan(produksi, hargaJual)
        : null;

    const keuntungan =
      penerimaan !== null ? computeKeuntungan(penerimaan, totalBiayaProduksi) : null;

    const hpp =
      produksi !== null && produksi > 0 ? computeHpp(totalBiayaProduksi, produksi) : null;

    const bepProduksi =
      hargaJual !== null && hargaJual > 0 ? computeBepProduksi(totalBiayaProduksi, hargaJual) : null;

    const bcRatio =
      keuntungan !== null ? computeBcRatio(keuntungan, totalBiayaProduksi) : null;

    const kelayakanStatus =
      produksi !== null && bepProduksi !== null
        ? computeKelayakanStatus(produksi, bepProduksi)
        : null;

    const incomeStatementWorksheet = buildIncomeStatementWorksheetData({
      transactions: reportTransactions,
      rabItems,
    });

    const kelayakanUsaha: KelayakanUsahaOutput = {
      totalBiayaProduksi,
      produksi,
      satuan,
      hargaJual,
      penerimaan,
      hpp,
      bepProduksi,
      bcRatio,
      kelayakanStatus,
    };

    return {
      reportTransactions,
      reportStartMonth: startMonth,
      reportEndMonth: endMonth,
      labaRugi,
      arusKasBulanan,
      incomeStatementWorksheet,
      kelayakanUsaha,
    };
  }, [project, rabItems, transactions, productionSalesAssumptions]);
}

export type UseFinanceReportControllerResult = {
  reportTransactions: FinanceTransactionForReport[];
  reportStartMonth: string;
  reportEndMonth: string;
  labaRugi: ReturnType<typeof computeLabaRugi>;
  arusKasBulanan: ArusKasBulanan[];
  incomeStatementWorksheet: IncomeStatementWorksheetData;
  kelayakanUsaha?: KelayakanUsahaOutput;
};

