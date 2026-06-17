'use client';

import { useMemo, useState } from 'react';

import { useRabItems } from '@/hooks/useRabItems';
import { parseRabWorkbookFromArrayBuffer } from '@/lib/finance/rabExcel';
import { sumRabItemsByType } from '@/lib/finance/rabCalculations';
import type { ApiFinanceProject, ApiRabCategory, ApiRabItem } from '@/lib/api';
import type { RabEntryType } from '@/lib/finance/rabTypes';

export interface RabItemDraft {
  categoryName: string;
  type: RabEntryType;
  name: string;
  volume: number;
  unit: string;
  unitPrice: number;
  plannedCashMonth?: string;
  aliases?: string[];
}

function toCategoryId(projectId: string, name: string) {
  return `${projectId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'kategori'}`;
}

export function useRabController(project: ApiFinanceProject | null) {
  const rabState = useRabItems(project?.id ?? null);
  const [rabItemDialogOpen, setRabItemDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      plannedIncome: sumRabItemsByType(rabState.items, 'income'),
      plannedExpense: sumRabItemsByType(rabState.items, 'expense'),
      plannedProfit: sumRabItemsByType(rabState.items, 'income') - sumRabItemsByType(rabState.items, 'expense'),
    }),
    [rabState.items],
  );

  const addRabItem = async (draft: RabItemDraft) => {
    if (!project) throw new Error('Pilih proyek terlebih dahulu');
    const existingCategory = rabState.categories.find(
      (category) => category.name.toLowerCase() === draft.categoryName.toLowerCase() && category.type === draft.type,
    );
    const category = existingCategory ?? await rabState.createCategory({
      projectId: project.id,
      name: draft.categoryName,
      type: draft.type,
      sortOrder: rabState.categories.length + 1,
    });

    return rabState.createItem({
      projectId: project.id,
      categoryId: category.id,
      categoryName: category.name,
      type: draft.type,
      name: draft.name,
      volume: draft.volume,
      unit: draft.unit,
      unitPrice: draft.unitPrice,
      plannedTotal: draft.volume * draft.unitPrice,
      plannedCashMonth: draft.plannedCashMonth,
      aliases: draft.aliases ?? [draft.name],
      sortOrder: rabState.items.length + 1,
    });
  };

  const importRabFile = async (file: File) => {
    if (!project) throw new Error('Pilih proyek terlebih dahulu');
    setImportLoading(true);
    setImportError(null);
    try {
      const parsed = await parseRabWorkbookFromArrayBuffer(await file.arrayBuffer());
      const categories: ApiRabCategory[] = parsed.categories.map((category, index) => ({
        ...category,
        id: toCategoryId(project.id, category.name),
        projectId: project.id,
        sortOrder: index + 1,
      }));
      const categoriesByName = new Map(categories.map((category) => [category.name, category]));
      const items: ApiRabItem[] = parsed.items.map((item, index) => {
        const category = categoriesByName.get(item.categoryName ?? item.categoryId) ?? categories[0];
        return {
          ...item,
          id: `${project.id}-rab-item-${index + 1}`,
          projectId: project.id,
          categoryId: category?.id ?? `${project.id}-uncategorized`,
          categoryName: category?.name ?? item.categoryName,
          sortOrder: index + 1,
        };
      });
      await rabState.replaceRab({ categories, items });
      setImportDialogOpen(false);
      return { categories, items };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal import RAB';
      setImportError(message);
      throw err;
    } finally {
      setImportLoading(false);
    }
  };

  return {
    ...rabState,
    rabItemDialogOpen,
    setRabItemDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    importLoading,
    importError,
    setImportError,
    totals,
    addRabItem,
    importRabFile,
  };
}

export type UseRabControllerResult = ReturnType<typeof useRabController>;
