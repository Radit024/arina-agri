'use client';

import { useMemo } from 'react';

import {
  computeLabaRugi,
  computeArusKasBulanan,
} from '@/lib/finance/scenarioCalculations';
import type { ApiFinanceProject, ApiTransaction } from '@/lib/api';
import type { ArusKasBulanan, FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';

function toMonthKey(date: string) {
  return date.slice(0, 7);
}

function transactionToReport(transaction: ApiTransaction): FinanceTransactionForReport {
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

function resolveReportRange(project: ApiFinanceProject | null, rabItems: RabItem[], transactions: ApiTransaction[]) {
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
}: {
  project: ApiFinanceProject | null;
  rabItems: RabItem[];
  transactions: ApiTransaction[];
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

    return {
      reportTransactions,
      reportStartMonth: startMonth,
      reportEndMonth: endMonth,
      labaRugi,
      arusKasBulanan,
    };
  }, [project, rabItems, transactions]);
}

export type UseFinanceReportControllerResult = ReturnType<typeof useFinanceReportController>;
