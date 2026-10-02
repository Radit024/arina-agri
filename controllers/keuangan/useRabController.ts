'use client';

import { useMemo, useState } from 'react';

import { useRabItemsForScenario } from '@/hooks/useRabItemsForScenario';
import { sumRabItemsByType } from '@/lib/finance/rabCalculations';
import { transactionApi, type ApiFinanceProject } from '@/lib/api';
import type { FinanceScenarioEntity, RabEntryType, RabItem } from '@/lib/finance/rabTypes';
import { useRabImport } from './useRabImport';

const PRESET_RAB_CATEGORIES: Record<RabEntryType, string[]> = {
  expense: ['Saprodi', 'Tenaga Kerja', 'Jasa Alsintan', 'Irigasi & Air', 'Alat Tani', 'Operasional', 'Lainnya'],
  income: ['Penjualan Hasil Panen', 'Jasa', 'Subsidi / Insentif', 'Lainnya'],
};

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
    type: 'expense',
    categoryName: PRESET_RAB_CATEGORIES.expense[0],
    name: '',
    volume: '1',
    unit: 'Unit',
    unitPrice: '',
    plannedCashMonth: '',
    aliases: '',
  };
}

function uniqueCategoryNames(names: string[]) {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getDefaultRabCategoryName(type: RabEntryType) {
  return PRESET_RAB_CATEGORIES[type][0];
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

export function validateRabItemDraft(draft: RabItemDraft) {
  if (!draft.categoryName.trim()) return 'Pilihan kategori tidak boleh kosong';
  if (!draft.name.trim()) return 'Nama barang/jasa tidak boleh kosong';
  if (!Number.isFinite(draft.volume) || draft.volume <= 0) return 'Jumlah/volume harus lebih dari 0';
  if (!draft.unit.trim()) return 'Satuan (misal: kg, liter, dll) tidak boleh kosong';
  if (!Number.isFinite(draft.unitPrice) || draft.unitPrice <= 0) return 'Harga satuan harus lebih dari 0';
  if (draft.plannedCashMonth) {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(draft.plannedCashMonth);
    const month = monthMatch ? Number(monthMatch[2]) : 0;
    if (!monthMatch || month < 1 || month > 12) {
      return 'Format bulan kurang tepat (harus Tahun-Bulan, misal 2026-08)';
    }
  }
  return null;
}

export function useRabController(
  project: ApiFinanceProject | null,
  addTransaction?: (data: Parameters<typeof transactionApi.create>[0] & { scenarioId?: string | null }) => Promise<void>,
  scenario?: FinanceScenarioEntity | null,
  cleanupRabLinks?: (rabItemIds: string[]) => Promise<void>,
) {
  const rabState = useRabItemsForScenario(scenario?.id ?? null);

  const {
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
  } = useRabImport({ project, scenario, rabState, addTransaction });

  const [rabItemDialogOpen, setRabItemDialogOpen] = useState(false);
  const [editingRabItemId, setEditingRabItemId] = useState<string | null>(null);
  const [rabItemError, setRabItemError] = useState<string | null>(null);
  const [rabItemDraft, setRabItemDraft] = useState<RabItemFormDraft>(createRabItemFormDraft);
  const [rabItemSubmitting, setRabItemSubmitting] = useState(false);
  const [rabCategoryDialogOpen, setRabCategoryDialogOpen] = useState(false);
  const [rabCategoryDeleteError, setRabCategoryDeleteError] = useState<string | null>(null);
  const [rabSearchQuery, setRabSearchQuery] = useState('');
  const [rabFilterJenis, setRabFilterJenis] = useState<'semua' | RabEntryType>('semua');
  const [selectedRabItemIds, setSelectedRabItemIds] = useState<string[]>([]);
  const [rabBulkDeleteConfirm, setRabBulkDeleteConfirm] = useState(false);
  const [rabItemDeleteError, setRabItemDeleteError] = useState<string | null>(null);

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

  const filteredRabItems = useMemo(() => {
    let result = rabState.items.filter(
      (item) => rabFilterJenis === 'semua' || item.type === rabFilterJenis,
    );

    if (rabSearchQuery.trim()) {
      const q = rabSearchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.categoryName ?? '').toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q) ||
          item.aliases.some((alias) => alias.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [rabState.items, rabFilterJenis, rabSearchQuery]);

  const toggleSelectRabItem = (id: string) => {
    setSelectedRabItemIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const clearRabItemSelection = () => setSelectedRabItemIds([]);

  const rabCategoryOptions = useMemo(
    () =>
      uniqueCategoryNames([
        rabItemDraft.categoryName,
        ...PRESET_RAB_CATEGORIES[rabItemDraft.type],
        ...rabState.categories
          .filter((category) => category.type === rabItemDraft.type)
          .map((category) => category.name),
      ]),
    [rabItemDraft.categoryName, rabItemDraft.type, rabState.categories],
  );

  const rabCategoryDialogItems = useMemo(
    () =>
      rabState.categories
        .filter((category) => category.type === rabItemDraft.type)
        .map((category) => ({ id: category.id, nama: category.name })),
    [rabItemDraft.type, rabState.categories],
  );

  const updateRabItemDraftField = (field: RabItemFormField, value: string) => {
    setRabItemDraft((current) => {
      if (field === 'type') {
        const nextType = value as RabEntryType;
        return { ...current, type: nextType, categoryName: getDefaultRabCategoryName(nextType) };
      }
      return { ...current, [field]: value };
    });
    setRabItemError(null);
  };

  const openRabItemDialog = () => {
    setRabItemDraft(createRabItemFormDraft());
    setEditingRabItemId(null);
    setRabItemError(null);
    setRabItemDialogOpen(true);
  };

  const openRabItemEditDialog = (item: RabItem) => {
    setRabItemDraft({
      categoryName: item.categoryName ?? getDefaultRabCategoryName(item.type),
      type: item.type,
      name: item.name,
      volume: String(item.volume),
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      plannedCashMonth: item.plannedCashMonth ?? '',
      aliases: item.aliases.join(', '),
    });
    setEditingRabItemId(item.id);
    setRabItemError(null);
    setRabItemDialogOpen(true);
  };

  const closeRabItemDialog = () => {
    setRabItemDialogOpen(false);
    setEditingRabItemId(null);
  };

  const addRabCategory = async (name: string) => {
    if (!project) throw new Error('Pilih proyek terlebih dahulu');
    const categoryName = name.trim();
    if (!categoryName) return null;

    const existingCategory = rabState.categories.find(
      (category) =>
        category.type === rabItemDraft.type &&
        category.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (existingCategory) {
      setRabItemDraft((current) => ({ ...current, categoryName: existingCategory.name }));
      return existingCategory;
    }

    const created = await rabState.createCategory({
      projectId: project.id,
      name: categoryName,
      type: rabItemDraft.type,
      sortOrder: rabState.categories.length + 1,
    });
    setRabItemDraft((current) => ({ ...current, categoryName: created.name }));
    return created;
  };

  const renameRabCategory = async (id: string, name: string) => {
    const categoryName = name.trim();
    if (!categoryName) return;
    const currentCategory = rabState.categories.find((category) => category.id === id);
    const updated = await rabState.updateCategory(id, { name: categoryName });
    if (
      currentCategory &&
      rabItemDraft.categoryName.toLowerCase() === currentCategory.name.toLowerCase()
    ) {
      setRabItemDraft((current) => ({ ...current, categoryName: updated?.name ?? categoryName }));
    }
  };

  const deleteRabCategory = async (id: string) => {
    const currentCategory = rabState.categories.find((category) => category.id === id);
    try {
      await rabState.deleteCategory(id);
      setRabCategoryDeleteError(null);
      if (
        currentCategory &&
        rabItemDraft.categoryName.toLowerCase() === currentCategory.name.toLowerCase()
      ) {
        setRabItemDraft((current) => ({
          ...current,
          categoryName: getDefaultRabCategoryName(current.type),
        }));
      }
    } catch (err) {
      setRabCategoryDeleteError(err instanceof Error ? err.message : 'Gagal menghapus kategori RAB');
    }
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
    const scenarioId = scenario?.id;
    const category = existingCategory ?? await rabState.createCategory({
      projectId: project.id,
      name: categoryName,
      type: draft.type,
      sortOrder: rabState.categories.length + 1,
      ...(scenarioId ? { scenarioId } : {}),
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
      ...(scenarioId ? { scenarioId } : {}),
    });
  };

  const updateRabItem = async (id: string, draft: RabItemDraft) => {
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
    const scenarioId = scenario?.id;
    const category = existingCategory ?? await rabState.createCategory({
      projectId: project.id,
      name: categoryName,
      type: draft.type,
      sortOrder: rabState.categories.length + 1,
      ...(scenarioId ? { scenarioId } : {}),
    });

    return rabState.updateItem(id, {
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
    });
  };

  const submitRabItemDraft = async () => {
    setRabItemSubmitting(true);
    try {
      const draft: RabItemDraft = {
        categoryName: rabItemDraft.categoryName,
        type: rabItemDraft.type,
        name: rabItemDraft.name,
        volume: parseNumberInput(rabItemDraft.volume),
        unit: rabItemDraft.unit,
        unitPrice: parseNumberInput(rabItemDraft.unitPrice),
        plannedCashMonth: rabItemDraft.plannedCashMonth.trim() || undefined,
        aliases: parseAliasesInput(rabItemDraft.aliases),
      };
      if (editingRabItemId) {
        await updateRabItem(editingRabItemId, draft);
      } else {
        await addRabItem(draft);
      }
      setRabItemDialogOpen(false);
      setEditingRabItemId(null);
      setRabItemDraft(createRabItemFormDraft());
    } catch {
      // Error message is set in rabItemError by addRabItem/updateRabItem
    } finally {
      setRabItemSubmitting(false);
    }
  };

  const deleteRabItem = async (id: string) => {
    try {
      await rabState.deleteItem(id);
      setRabItemDeleteError(null);
      setSelectedRabItemIds((prev) => prev.filter((itemId) => itemId !== id));
      await cleanupRabLinks?.([id]);
    } catch (err) {
      setRabItemDeleteError(err instanceof Error ? err.message : 'Gagal menghapus item RAB');
    }
  };

  const handleBulkDeleteRabItems = async () => {
    const ids = [...selectedRabItemIds];
    for (const id of ids) {
      await rabState.deleteItem(id);
    }
    setSelectedRabItemIds([]);
    setRabBulkDeleteConfirm(false);
    await cleanupRabLinks?.(ids);
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
    importWarnings,
    setImportWarnings,
    preflightData,
    setPreflightData,
    preflightFile,
    importSummary,
    setImportSummary,
    confirmPreflightAndImport,
    resetImportState,
    rabItemError,
    setRabItemError,
    rabItemDraft,
    rabItemPlannedTotal,
    rabItemSubmitting,
    rabCategoryOptions,
    rabCategoryDialogOpen,
    setRabCategoryDialogOpen,
    rabCategoryDialogItems,
    rabCategoryDeleteError,
    setRabCategoryDeleteError,
    addRabCategory,
    renameRabCategory,
    deleteRabCategory,
    updateRabItemDraftField,
    openRabItemDialog,
    openRabItemEditDialog,
    closeRabItemDialog,
    editingRabItemId,
    totals,
    addRabItem,
    updateRabItem,
    deleteRabItem,
    rabItemDeleteError,
    setRabItemDeleteError,
    submitRabItemDraft,
    importRabFile,
    filteredRabItems,
    rabSearchQuery,
    setRabSearchQuery,
    rabFilterJenis,
    setRabFilterJenis,
    selectedRabItemIds,
    toggleSelectRabItem,
    clearRabItemSelection,
    rabBulkDeleteConfirm,
    setRabBulkDeleteConfirm,
    handleBulkDeleteRabItems,
  };
}

export type UseRabControllerResult = ReturnType<typeof useRabController>;
