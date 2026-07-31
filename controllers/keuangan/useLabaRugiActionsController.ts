'use client';

import { useMemo, useState } from 'react';

import type { IncomeStatementComparisonRow, RabEntryType, RabItem } from '@/lib/finance/rabTypes';

export function useLabaRugiActionsController({
  rows,
  rabItems,
  openRabItemEditDialog,
  deleteRabItem,
}: {
  rows: IncomeStatementComparisonRow[];
  rabItems: RabItem[];
  openRabItemEditDialog: (item: RabItem) => void;
  deleteRabItem: (id: string) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'semua' | RabEntryType>('semua');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteTargetRow, setDeleteTargetRow] = useState<IncomeStatementComparisonRow | null>(null);

  const filteredRows = useMemo(() => {
    let result = rows.filter((row) => filterJenis === 'semua' || row.type === filterJenis);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (row) => row.itemName.toLowerCase().includes(q) || row.categoryName.toLowerCase().includes(q),
      );
    }

    return result;
  }, [rows, filterJenis, searchQuery]);

  const toggleSelect = (itemId: string) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const clearSelection = () => setSelectedItemIds([]);

  const editRow = (row: IncomeStatementComparisonRow) => {
    if (!row.itemId) return;
    const item = rabItems.find((candidate) => candidate.id === row.itemId);
    if (item) openRabItemEditDialog(item);
  };

  const confirmDeleteRow = async (itemId?: string) => {
    const targetId = itemId ?? deleteTargetRow?.itemId;
    if (!targetId) return;
    await deleteRabItem(targetId);
    setSelectedItemIds((prev) => prev.filter((id) => id !== targetId));
    setDeleteTargetRow(null);
  };

  const handleBulkDelete = async () => {
    for (const itemId of selectedItemIds) {
      await deleteRabItem(itemId);
    }
    setSelectedItemIds([]);
    setBulkDeleteConfirm(false);
  };

  return {
    filteredRows,
    searchQuery,
    setSearchQuery,
    filterJenis,
    setFilterJenis,
    selectedItemIds,
    toggleSelect,
    clearSelection,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete,
    editRow,
    deleteTargetRow,
    setDeleteTargetRow,
    confirmDeleteRow,
  };
}

export type UseLabaRugiActionsControllerResult = ReturnType<typeof useLabaRugiActionsController>;
