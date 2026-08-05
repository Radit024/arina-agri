'use client';

import { useMemo } from 'react';

import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import { useProductionSalesAssumptions } from '@/hooks/useProductionSalesAssumptions';
import { useRabItemsForScenario } from '@/hooks/useRabItemsForScenario';
import { useTransactionsForScenario } from '@/hooks/useTransactionsForScenario';
import type { ApiFinanceProject } from '@/lib/api';
import {
  computeArusKasBulanan,
  computeArusKasPascaPembiayaan,
  computeBcRatio,
  computeBepProduksi,
  computeBunga,
  computeHpp,
  computeKebutuhanModalKerja,
  computeKeuntungan,
  computeLabaRugi,
  computePenerimaan,
} from '@/lib/finance/scenarioCalculations';
import { resolveReportRange, transactionToReport } from '@/controllers/keuangan/useFinanceReportController';
import { toMonthKey } from '@/lib/finance/rabCalculations';
import type { ScenarioOutput } from '@/lib/finance/rabTypes';

export interface UseScenarioOutputResult {
  output: ScenarioOutput;
  loading: boolean;
  error: string | null;
  hasData: boolean;
}

const EMPTY_OUTPUT: ScenarioOutput = {
  totalPendapatan: 0,
  totalBiayaProduksi: 0,
  labaRugi: 0,
  hpp: null,
  bepProduksi: null,
  bcRatio: null,
  kategoriTotals: {},
  arusKasBulanan: [],
  kebutuhanModalKerja: 0,
  bunga: 0,
  kasAkhirPascaPembiayaan: 0,
};

export function useScenarioOutput({
  scenarioId,
  project,
}: {
  scenarioId: string | null;
  project: ApiFinanceProject | null;
}): UseScenarioOutputResult {
  const { items: rabItems, loading: rabLoading, error: rabError } = useRabItemsForScenario(scenarioId);
  const { transactions, loading: txLoading, error: txError } = useTransactionsForScenario(scenarioId);
  const {
    assumptions: prodAssumptions,
    loading: prodLoading,
    error: prodError,
  } = useProductionSalesAssumptions(scenarioId);
  const {
    assumptions: finAssumptions,
    loading: finLoading,
    error: finError,
  } = useFinancingAssumptions(scenarioId);

  const result = useMemo(() => {
    if (!scenarioId) {
      return {
        output: EMPTY_OUTPUT,
        hasData: false,
      };
    }

    const safeTransactions = transactions || [];
    const safeRabItems = rabItems || [];

    const filteredTransactions = project
      ? safeTransactions.filter((tx) => !tx.projectId || tx.projectId === project.id)
      : safeTransactions;

    const reportTransactions = filteredTransactions.map(transactionToReport);
    const { startMonth, endMonth } = resolveReportRange(project, safeRabItems, filteredTransactions);

    const labaRugi = computeLabaRugi(reportTransactions);
    const totalPendapatan = labaRugi.totalPendapatan;
    const totalBiayaProduksi = labaRugi.totalPengeluaran;

    const produksi = prodAssumptions?.produksi ?? null;
    const hargaJual = prodAssumptions?.hargaJual ?? null;

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

    const kategoriTotals: Record<string, number> = {};
    for (const tx of reportTransactions) {
      const typePrefix = tx.jenis === 'pendapatan' ? 'income' : 'expense';
      const key = `${typePrefix}:${tx.kategori}`;
      kategoriTotals[key] = (kategoriTotals[key] ?? 0) + tx.nominal;
    }

    const arusKasBulanan = computeArusKasBulanan(reportTransactions, startMonth, endMonth);
    const kebutuhanModalKerja = computeKebutuhanModalKerja(arusKasBulanan);
    const bunga = finAssumptions
      ? computeBunga(finAssumptions.nilaiPinjaman, finAssumptions.bungaPerPeriode)
      : 0;

    const arusKasPascaPembiayaan = finAssumptions
      ? computeArusKasPascaPembiayaan(arusKasBulanan, {
          nilaiPinjaman: finAssumptions.nilaiPinjaman,
          bungaPerPeriode: finAssumptions.bungaPerPeriode,
          biayaLain: finAssumptions.biayaLain,
          pencairanBulan: finAssumptions.tanggalPencairan
            ? toMonthKey(finAssumptions.tanggalPencairan)
            : '',
          pembayaranBulan: finAssumptions.tanggalPembayaran
            ? toMonthKey(finAssumptions.tanggalPembayaran)
            : '',
        })
      : [];

    const kasAkhirPascaPembiayaan =
      finAssumptions && arusKasPascaPembiayaan.length > 0
        ? arusKasPascaPembiayaan[arusKasPascaPembiayaan.length - 1].kasKumulatifSetelahPembiayaan
        : 0;

    const hasData = safeRabItems.length > 0 || filteredTransactions.length > 0;

    return {
      output: {
        totalPendapatan,
        totalBiayaProduksi,
        labaRugi: labaRugi.labaRugi,
        hpp,
        bepProduksi,
        bcRatio,
        kategoriTotals,
        arusKasBulanan,
        kebutuhanModalKerja,
        bunga,
        kasAkhirPascaPembiayaan,
      },
      hasData,
    };
  }, [scenarioId, project, rabItems, transactions, prodAssumptions, finAssumptions]);

  const loading = rabLoading || txLoading || prodLoading || finLoading;
  const error = rabError || txError || prodError || finError;

  return {
    output: result.output,
    loading,
    error,
    hasData: result.hasData,
  };
}
