'use client';

import { useState } from 'react';

import { buildFinanceExportWorkbook } from '@/lib/finance/rabExcel';
import type { ApiFinanceProject } from '@/lib/api';
import type { FinanceTransactionForReport, RabItem } from '@/lib/finance/rabTypes';

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'keuangan';
}

export function useFinanceExportController({
  project,
  rabItems,
  transactions,
  startMonth,
  endMonth,
  canExport,
  hasProjectData,
}: {
  project: ApiFinanceProject | null;
  rabItems: RabItem[];
  transactions: FinanceTransactionForReport[];
  startMonth: string;
  endMonth: string;
  canExport?: boolean;
  hasProjectData?: boolean;
}) {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportFinanceWorkbook = async () => {
    if (!project) {
      setExportError('Buat atau pilih proyek terlebih dahulu');
      return;
    }

    const effectiveHasProjectData = hasProjectData ?? (rabItems.length > 0 || transactions.length > 0);
    const effectiveCanExport = canExport ?? effectiveHasProjectData;
    if (!effectiveCanExport || !effectiveHasProjectData) {
      setExportError('Tambahkan transaksi atau RAB sebelum export laporan');
      return;
    }

    setExportLoading(true);
    setExportError(null);
    try {
      const [workbook, { saveAs }] = await Promise.all([
        buildFinanceExportWorkbook({
          project,
          rabItems,
          transactions,
          startMonth,
          endMonth,
        }),
        import('file-saver'),
      ]);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `laporan-keuangan-${sanitizeFilename(project.name)}.xlsx`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  return {
    exportLoading,
    exportError,
    setExportError,
    handleExportFinanceWorkbook,
  };
}

export type UseFinanceExportControllerResult = ReturnType<typeof useFinanceExportController>;
