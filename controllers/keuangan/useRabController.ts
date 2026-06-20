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

export interface RabItemFormDraft {
  categoryName: string;
  type: RabEntryType;
  name: string;
  volume: string;
  unit: string;
  unitPrice: string;
  plannedCashMonth: string;
  aliases: string;
}

export type RabItemFormField = keyof RabItemFormDraft;

function createRabItemFormDraft(): RabItemFormDraft {
  return {
    categoryName: 'Saprodi',
    type: 'expense',
    name: '',
    volume: '1',
    unit: 'Unit',
    unitPrice: '',
    plannedCashMonth: '',
    aliases: '',
  };
}

function parseNumberInput(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAliasesInput(value: string) {
  const aliases = value
    .split(/[,;\n]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
  return aliases.length > 0 ? aliases : undefined;
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
  const [rabItemDraft, setRabItemDraft] = useState<RabItemFormDraft>(createRabItemFormDraft);
  const [rabItemSubmitting, setRabItemSubmitting] = useState(false);

  const totals = useMemo(
    () => ({
      plannedIncome: sumRabItemsByType(rabState.items, 'income'),
      plannedExpense: sumRabItemsByType(rabState.items, 'expense'),
      plannedProfit: sumRabItemsByType(rabState.items, 'income') - sumRabItemsByType(rabState.items, 'expense'),
    }),
    [rabState.items],
  );

  const rabItemPlannedTotal = useMemo(
    () => parseNumberInput(rabItemDraft.volume) * parseNumberInput(rabItemDraft.unitPrice),
    [rabItemDraft.unitPrice, rabItemDraft.volume],
  );

  const updateRabItemDraftField = (field: RabItemFormField, value: string) => {
    setRabItemDraft((current) => ({ ...current, [field]: value }));
    setRabItemError(null);
  };

  const openRabItemDialog = () => {
    setRabItemDraft(createRabItemFormDraft());
    setRabItemError(null);
    setRabItemDialogOpen(true);
  };

  const closeRabItemDialog = () => {
    setRabItemDialogOpen(false);
  };

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

  const submitRabItemDraft = async () => {
    setRabItemSubmitting(true);
    try {
      await addRabItem({
        categoryName: rabItemDraft.categoryName,
        type: rabItemDraft.type,
        name: rabItemDraft.name,
        volume: parseNumberInput(rabItemDraft.volume),
        unit: rabItemDraft.unit,
        unitPrice: parseNumberInput(rabItemDraft.unitPrice),
        plannedCashMonth: rabItemDraft.plannedCashMonth.trim() || undefined,
        aliases: parseAliasesInput(rabItemDraft.aliases),
      });
      setRabItemDialogOpen(false);
      setRabItemDraft(createRabItemFormDraft());
    } finally {
      setRabItemSubmitting(false);
    }
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
    rabItemDraft,
    rabItemPlannedTotal,
    rabItemSubmitting,
    updateRabItemDraftField,
    openRabItemDialog,
    closeRabItemDialog,
    totals,
    addRabItem,
    submitRabItemDraft,
    importRabFile,
  };
}

export type UseRabControllerResult = ReturnType<typeof useRabController>;
