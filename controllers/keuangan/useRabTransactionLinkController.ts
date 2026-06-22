'use client';

import { useMemo, useState } from 'react';

import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import type { ApiTransaction } from '@/lib/api';
import type { RabEntryType, RabItem } from '@/lib/finance/rabTypes';

export interface RabTransactionLinkOption {
  item: RabItem;
  isSuggested: boolean;
}

type LinkResult = {
  success: number;
  failed: number;
};

function transactionTypeToRabType(jenis: ApiTransaction['jenis']): RabEntryType {
  return jenis === 'pendapatan' ? 'income' : 'expense';
}

function resolveTargetRabType(transactions: ApiTransaction[]): RabEntryType | null {
  const types = new Set(transactions.map((tx) => transactionTypeToRabType(tx.jenis)));
  return types.size === 1 ? Array.from(types)[0] : null;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function itemMatchesSearch(item: RabItem, searchQuery: string) {
  const query = normalizeSearch(searchQuery);
  if (!query) return true;

  const haystack = normalizeSearch([
    item.name,
    item.categoryName ?? '',
    item.unit,
    item.plannedCashMonth ?? '',
    ...item.aliases,
  ].join(' '));

  return haystack.includes(query);
}

export function useRabTransactionLinkController({
  rabItems,
  transactions,
  updateTransaction,
}: {
  rabItems: RabItem[];
  transactions: ApiTransaction[];
  updateTransaction: (id: string, data: Partial<ApiTransaction>) => Promise<unknown>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetTransactionIds, setTargetTransactionIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const transactionsById = useMemo(
    () => new Map(transactions.map((transaction) => [transaction._id, transaction])),
    [transactions],
  );

  const targetTransactions = useMemo(
    () => targetTransactionIds
      .map((id) => transactionsById.get(id))
      .filter((transaction): transaction is ApiTransaction => Boolean(transaction)),
    [targetTransactionIds, transactionsById],
  );

  const targetRabType = useMemo(
    () => resolveTargetRabType(targetTransactions),
    [targetTransactions],
  );

  const suggestedRabItemIds = useMemo(() => {
    const [transaction] = targetTransactions;
    if (targetTransactions.length !== 1 || !transaction) return new Set<string>();

    return new Set(
      suggestRabItemsForTransaction({
        items: rabItems,
        transaction: {
          jenis: transaction.jenis,
          kategori: transaction.kategori,
          keterangan: transaction.keterangan,
        },
      }).map((suggestion) => suggestion.item.id),
    );
  }, [rabItems, targetTransactions]);

  const filteredRabOptions = useMemo<RabTransactionLinkOption[]>(() => {
    if (!targetRabType) return [];

    return rabItems
      .filter((item) => item.type === targetRabType)
      .filter((item) => itemMatchesSearch(item, searchQuery))
      .map((item) => ({
        item,
        isSuggested: suggestedRabItemIds.has(item.id),
      }))
      .sort((a, b) => {
        if (a.isSuggested !== b.isSuggested) return a.isSuggested ? -1 : 1;
        return a.item.sortOrder - b.item.sortOrder || a.item.name.localeCompare(b.item.name);
      });
  }, [rabItems, searchQuery, suggestedRabItemIds, targetRabType]);

  const openForTransactions = (ids: string[]) => {
    const uniqueExistingIds = Array.from(new Set(ids)).filter((id) => transactionsById.has(id));
    if (uniqueExistingIds.length === 0) return;

    setTargetTransactionIds(uniqueExistingIds);
    setSearchQuery('');
    setLinkError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setLinkError(null);
  };

  const linkToRabItem = async (item: RabItem): Promise<LinkResult> => {
    if (targetTransactions.length === 0) {
      const result = { success: 0, failed: 0 };
      setDialogOpen(false);
      return result;
    }

    if (!targetRabType || item.type !== targetRabType) {
      const result = { success: 0, failed: targetTransactions.length };
      setLinkError('Pilih transaksi dengan jenis yang sama sebelum menghubungkan RAB.');
      return result;
    }

    setSubmitting(true);
    setLinkError(null);

    let success = 0;
    let failed = 0;
    for (const transaction of targetTransactions) {
      try {
        await updateTransaction(transaction._id, {
          projectId: item.projectId,
          rabCategoryId: item.categoryId,
          rabItemId: item.id,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setSubmitting(false);
    if (failed === 0) {
      setDialogOpen(false);
      setTargetTransactionIds([]);
    } else {
      setLinkError(`${failed} transaksi gagal dihubungkan ke RAB.`);
    }

    return { success, failed };
  };

  const getLinkedRabItem = (transaction: ApiTransaction) => {
    if (!transaction.rabItemId) return null;
    return rabItems.find((item) => item.id === transaction.rabItemId) ?? null;
  };

  return {
    dialogOpen,
    targetTransactionIds,
    targetTransactions,
    targetRabType,
    searchQuery,
    setSearchQuery,
    submitting,
    linkError,
    filteredRabOptions,
    openForTransactions,
    closeDialog,
    linkToRabItem,
    getLinkedRabItem,
  };
}

export type UseRabTransactionLinkControllerResult = ReturnType<typeof useRabTransactionLinkController>;
