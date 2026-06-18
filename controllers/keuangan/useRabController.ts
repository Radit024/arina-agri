'use client';

import { useMemo, useState } from 'react';

import { useRabItems } from '@/hooks/useRabItems';
import { sumRabItemsByType } from '@/lib/finance/rabCalculations';
import type { ApiFinanceProject } from '@/lib/api';
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

function validateRabItemDraft(draft: RabItemDraft) {
  if (!draft.categoryName.trim()) return 'Kategori RAB wajib diisi';
  if (!draft.name.trim()) return 'Nama item RAB wajib diisi';
  if (!Number.isFinite(draft.volume) || draft.volume <= 0) return 'Volume RAB harus lebih dari 0';
  if (!draft.unit.trim()) return 'Satuan RAB wajib diisi';
  if (!Number.isFinite(draft.unitPrice) || draft.unitPrice <= 0) return 'Harga satuan RAB harus lebih dari 0';
  if (draft.plannedCashMonth) {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(draft.plannedCashMonth);
    const month = monthMatch ? Number(monthMatch[2]) : 0;
    if (!monthMatch || month < 1 || month > 12) {
      return 'Bulan kas harus memakai format YYYY-MM';
    }
  }
  return null;
}

export function useRabController(project: ApiFinanceProject | null) {
  const rabState = useRabItems(project?.id ?? null);
  const [rabItemDialogOpen, setRabItemDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const importLoading = false;
  const [importError, setImportError] = useState<string | null>(null);
  const [rabItemError, setRabItemError] = useState<string | null>(null);

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
    const validationError = validateRabItemDraft(draft);
    if (validationError) {
      setRabItemError(validationError);
      throw new Error(validationError);
    }
    setRabItemError(null);

    const categoryName = draft.categoryName.trim();
    const itemName = draft.name.trim();
    const unit = draft.unit.trim();
    const existingCategory = rabState.categories.find(
      (category) => category.name.toLowerCase() === categoryName.toLowerCase() && category.type === draft.type,
    );
    const category = existingCategory ?? await rabState.createCategory({
      projectId: project.id,
      name: categoryName,
      type: draft.type,
      sortOrder: rabState.categories.length + 1,
    });

    return rabState.createItem({
      projectId: project.id,
      categoryId: category.id,
      categoryName: category.name,
      type: draft.type,
      name: itemName,
      volume: draft.volume,
      unit,
      unitPrice: draft.unitPrice,
      plannedTotal: draft.volume * draft.unitPrice,
      plannedCashMonth: draft.plannedCashMonth,
      aliases: draft.aliases ?? [itemName],
      sortOrder: rabState.items.length + 1,
    });
  };

  const importRabFile = async (file: File) => {
    void file;
    if (!project) throw new Error('Pilih proyek terlebih dahulu');
    const message = 'Import Excel sementara dinonaktifkan';
    setImportError(message);
    throw new Error(message);
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
    rabItemError,
    setRabItemError,
    totals,
    addRabItem,
    importRabFile,
  };
}

export type UseRabControllerResult = ReturnType<typeof useRabController>;
