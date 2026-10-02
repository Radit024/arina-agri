'use client';

import { useState } from 'react';

import { useRabItemsForScenario } from '@/hooks/useRabItemsForScenario';
import { rabApi, transactionApi, type ApiFinanceProject } from '@/lib/api';
import {
  DEFAULT_FINANCE_CATEGORIES,
  resolveFinanceCategory,
} from '@/lib/finance/categories';
import {
  parseRabWorkbookFromArrayBuffer,
  type ParsedRabWorkbook,
  type RabCategoryReconciliation,
  type RabParseSkippedRow,
} from '@/lib/finance/rabExcel';
import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import type { FinanceScenarioEntity, RabItem } from '@/lib/finance/rabTypes';

export interface RabImportSummary {
  projectName: string;
  importedItemsCount: number;
  importedTransactionCount: number;
  skippedCount: number;
  warnings: string[];
  reconciliation: RabCategoryReconciliation[];
  skippedRows: RabParseSkippedRow[];
}

const RAB_SUGGESTION_MIN_SCORE = 5;
const RECONCILIATION_ABSOLUTE_TOLERANCE = 1000;
const RECONCILIATION_RELATIVE_TOLERANCE = 0.005;

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(value));
}

function buildImportWarnings(parsed: ParsedRabWorkbook): string[] {
  const warnings: string[] = [];

  for (const entry of parsed.reconciliation) {
    if (!entry.checked) continue;
    const tolerance = Math.max(
      RECONCILIATION_ABSOLUTE_TOLERANCE,
      Math.abs(entry.declaredTotal) * RECONCILIATION_RELATIVE_TOLERANCE,
    );
    if (Math.abs(entry.difference) > tolerance) {
      warnings.push(
        `Pada kelompok "${entry.categoryName}": Total hasil hitungan aplikasi (Rp${formatRupiah(entry.computedTotal)}) sedikit berbeda dengan angka TOTAL yang Anda tulis (Rp${formatRupiah(entry.declaredTotal)})`,
      );
    }
  }

  if (parsed.warnings) {
    for (const w of parsed.warnings) {
      const cleanedMessage = w.message.replace('Parser tidak yakin: ', '');
      warnings.push(`Item "${w.description}" (Baris ${w.rowNumber}): ${cleanedMessage}`);
    }
  }

  return warnings;
}

/** Bentuk minimum dari state RAB yang dibutuhkan saat menulis hasil import. */
type RabStateForImport = ReturnType<typeof useRabItemsForScenario>;

type AddTransaction = (
  data: Parameters<typeof transactionApi.create>[0] & {
    scenarioId?: string | null;
  },
) => Promise<void>;

/**
 * Impor RAB dari workbook Excel.
 *
 * Dipisah dari `useRabController` karena seluruh alurnya berdiri sendiri: parse
 * file → preflight bila ada selisih rekonsiliasi → tulis kategori, item, dan
 * transaksi. Satu-satunya interaksi dengan state RAB adalah lewat `rabState`.
 *
 * Preflight sengaja tidak di-bypass-kan: kalau angka rekonsiliasi berbeda jauh
 * dari hasil hitungan aplikasi, pengguna diminta konfirmasi dulu sebelum data
 * ditulis.
 */
export function useRabImport({
  project,
  scenario,
  rabState,
  addTransaction,
}: {
  project: ApiFinanceProject | null;
  scenario?: FinanceScenarioEntity | null;
  rabState: RabStateForImport;
  addTransaction?: AddTransaction;
}) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [preflightData, setPreflightData] = useState<ParsedRabWorkbook | null>(null);
  const [preflightFile, setPreflightFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<RabImportSummary | null>(null);

  const executeParsedImport = async (
    parsed: ParsedRabWorkbook,
    file: File,
    targetScenarioId?: string,
  ) => {
    if (!project) throw new Error('Pilih proyek terlebih dahulu');
    const scenarioId = targetScenarioId ?? scenario?.id;
    setImportLoading(true);
    setImportError(null);
    setImportWarnings([]);
    try {
      const categoryIdMap = new Map<string, Awaited<ReturnType<typeof rabState.createCategory>>>();
      for (const category of parsed.categories) {
        const existingCategory = rabState.categories.find(
          (candidate) =>
            candidate.type === category.type &&
            candidate.name.toLowerCase() === category.name.toLowerCase(),
        );
        const resolvedCategory = existingCategory ?? await rabState.createCategory({
          projectId: project.id,
          name: category.name,
          type: category.type,
          sortOrder: rabState.categories.length + categoryIdMap.size + 1,
          ...(scenarioId ? { scenarioId } : {}),
        });
        categoryIdMap.set(category.id, resolvedCategory);
      }

      let importedCount = 0;
      const createdItems: RabItem[] = [];
      for (const item of parsed.items) {
        const category = categoryIdMap.get(item.categoryId);
        if (!category) continue;
        const createdItem = await rabState.createItem({
          projectId: project.id,
          categoryId: category.id,
          categoryName: category.name,
          type: item.type,
          name: item.name,
          volume: item.volume,
          unit: item.unit,
          unitPrice: item.unitPrice,
          plannedTotal: item.plannedTotal,
          plannedCashMonth: item.plannedCashMonth,
          aliases: item.aliases,
          sortOrder: rabState.items.length + importedCount + 1,
          ...(scenarioId ? { scenarioId } : {}),
        });
        createdItems.push(createdItem);
        importedCount += 1;
      }

      let importedTransactionCount = 0;
      const unlinkedTransactionNames: string[] = [];
      if (addTransaction && parsed.transactions.length > 0) {
        const rabItemPool = [...rabState.items, ...createdItems];
        const categoryDefs = [
          ...Array.from(categoryIdMap.values()).map((c) => ({
            id: c.id,
            jenis: c.type === 'income' ? ('pendapatan' as const) : ('pengeluaran' as const),
            label: c.name,
            aliases: [c.name],
          })),
          ...DEFAULT_FINANCE_CATEGORIES,
        ];

        for (const transaction of parsed.transactions) {
          const suggestion = suggestRabItemsForTransaction({
            items: rabItemPool,
            transaction: { jenis: transaction.jenis, keterangan: transaction.keterangan },
          })[0];
          const matchedItem =
            suggestion && suggestion.score >= RAB_SUGGESTION_MIN_SCORE ? suggestion.item : null;

          const resolvedCategory = resolveFinanceCategory({
            jenis: transaction.jenis,
            kategori: matchedItem?.categoryName ?? '',
            keterangan: transaction.keterangan,
            categories: categoryDefs,
          });

          const rawKategori = matchedItem?.categoryName ?? resolvedCategory?.label ?? 'Lainnya';
          const existingCategory = Array.from(categoryIdMap.values()).find(
            (c) => c.name.toLowerCase() === rawKategori.toLowerCase(),
          );
          const kategori = existingCategory ? existingCategory.name : rawKategori;
          const assignedCategoryId = matchedItem?.categoryId ?? existingCategory?.id ?? null;

          const isCategoryResolved = Boolean(
            existingCategory || (resolvedCategory && resolvedCategory.label !== 'Lainnya'),
          );
          if (!matchedItem && !isCategoryResolved) {
            unlinkedTransactionNames.push(transaction.keterangan);
          }

          try {
            await addTransaction({
              jenis: transaction.jenis,
              kategori,
              nominal: transaction.nominal,
              tanggal: transaction.tanggal,
              keterangan: transaction.keterangan,
              projectId: project.id,
              rabCategoryId: assignedCategoryId,
              rabItemId: matchedItem?.id ?? null,
              volume: transaction.volume ?? null,
              satuan: transaction.satuan ?? null,
              hargaSatuan: transaction.hargaSatuan ?? null,
              scenarioId: scenarioId ?? null,
            });
            importedTransactionCount += 1;
          } catch {
            // Satu baris transaksi gagal tidak boleh menggagalkan seluruh proses import.
          }
        }
      }

      const warnings = buildImportWarnings(parsed);

      if (unlinkedTransactionNames.length > 0) {
        const uniqueNames = Array.from(new Set(unlinkedTransactionNames));
        const displayNames = uniqueNames.slice(0, 3);
        const othersCount = uniqueNames.length - displayNames.length;

        let namesText = displayNames.map((n) => `"${n}"`).join(', ');
        if (othersCount > 0) namesText += `, dan ${othersCount} lainnya`;

        warnings.push(
          `Ada ${unlinkedTransactionNames.length} transaksi harian yang belum terhubung ke kelompok RAB karena namanya berbeda (${namesText}). Anda dapat menyesuaikannya nanti di menu Transaksi.`,
        );
      }

      setImportWarnings(warnings);

      const skippedCount = parsed.skippedRows.length;
      const hasReconciliationWarning = warnings.some((warning) => warning.startsWith('Kategori'));
      const summary =
        `${importedCount} item RAB dan ${importedTransactionCount} transaksi berhasil diimpor dari "${parsed.project.name}"` +
        (skippedCount > 0 ? `, ${skippedCount} baris dilewati` : '') +
        (hasReconciliationWarning ? ', ada selisih rekonsiliasi' : '');

      try {
        await rabApi.recordImport({
          projectId: project.id,
          fileName: file.name,
          status: 'success',
          summary,
          errors: [],
        });
      } catch {
        // Riwayat import bersifat opsional
      }

      setImportSummary({
        projectName: parsed.project.name,
        importedItemsCount: importedCount,
        importedTransactionCount,
        skippedCount,
        warnings,
        reconciliation: parsed.reconciliation,
        skippedRows: parsed.skippedRows,
      });

      setPreflightData(null);
      setPreflightFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengimpor file Excel';
      setImportError(message);
      throw new Error(message);
    } finally {
      setImportLoading(false);
    }
  };

  const importRabFile = async (
    file: File,
    targetScenarioId?: string,
    skipPreflightCheck = false,
  ) => {
    if (!project) throw new Error('Pilih proyek terlebih dahulu');
    setImportLoading(true);
    setImportError(null);
    setImportWarnings([]);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseRabWorkbookFromArrayBuffer(buffer);
      if (parsed.items.length === 0) {
        throw new Error('Tidak ada item RAB yang terbaca dari file ini');
      }

      const warnings = buildImportWarnings(parsed);
      const hasMaterialDiscrepancy = parsed.reconciliation.some(
        (r) =>
          r.checked &&
          Math.abs(r.difference) >
            Math.max(
              RECONCILIATION_ABSOLUTE_TOLERANCE,
              Math.abs(r.declaredTotal) * RECONCILIATION_RELATIVE_TOLERANCE,
            ),
      );

      if (!skipPreflightCheck && (hasMaterialDiscrepancy || warnings.length > 0)) {
        setPreflightData(parsed);
        setPreflightFile(file);
        setImportWarnings(warnings);
        setImportLoading(false);
        return;
      }

      await executeParsedImport(parsed, file, targetScenarioId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengimpor file Excel';
      setImportError(message);
      setImportLoading(false);
      throw new Error(message);
    }
  };

  const confirmPreflightAndImport = async (targetScenarioId?: string) => {
    if (!preflightData || !preflightFile) return;
    await executeParsedImport(preflightData, preflightFile, targetScenarioId);
  };

  const resetImportState = () => {
    setImportSummary(null);
    setPreflightData(null);
    setPreflightFile(null);
    setImportError(null);
    setImportWarnings([]);
    setImportLoading(false);
  };

  return {
    importDialogOpen,
    setImportDialogOpen,
    importLoading,
    importError,
    setImportError,
    importWarnings,
    setImportWarnings,
    preflightData,
    setPreflightData,
    preflightFile,
    importSummary,
    setImportSummary,
    importRabFile,
    confirmPreflightAndImport,
    resetImportState,
  };
}
