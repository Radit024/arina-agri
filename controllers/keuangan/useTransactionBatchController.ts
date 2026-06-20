'use client';

import { useState, useMemo } from 'react';
import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import { isValidDateInputValue, normalizeDateInputValue } from '@/lib/formatters';
import type { ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';

export type TransactionDraft = {
  id: string;
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  projectId?: string | null;
  volume: string;
  satuan: string;
  hargaSatuan: string;
  nominal: string;
  tanggal: string;
  keterangan: string;
};

export type DraftErrors = Record<string, string>;
export type AllDraftErrors = Record<string, DraftErrors>;

const MIN_AUTO_RAB_LINK_SCORE = 4;

function createEmptyDraft(): TransactionDraft {
  return {
    id: crypto.randomUUID(),
    jenis: 'pengeluaran',
    kategori: '',
    volume: '',
    satuan: '',
    hargaSatuan: '',
    nominal: '',
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
  };
}

function formatNumber(value: string): string {
  const raw = value.replace(/\D/g, '');
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseCurrencyNumber(formatted: string): number {
  return Number(formatted.replace(/\./g, '')) || 0;
}

function parseQuantityNumber(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateDraft(draft: TransactionDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.kategori.trim()) errors.kategori = 'Kategori wajib dipilih';
  if (!draft.tanggal) errors.tanggal = 'Tanggal wajib diisi';
  else if (!isValidDateInputValue(draft.tanggal)) errors.tanggal = 'Format tanggal harus dd-MM-yyyy';

  const nominalNum = parseCurrencyNumber(draft.nominal);
  if (!draft.nominal || nominalNum <= 0) errors.nominal = 'Nominal harus lebih dari 0';

  if (draft.volume.trim() && parseQuantityNumber(draft.volume) <= 0) {
    errors.volume = 'Volume harus lebih dari 0';
  }
  if (draft.hargaSatuan.trim() && parseCurrencyNumber(draft.hargaSatuan) <= 0) {
    errors.hargaSatuan = 'Harga satuan harus lebih dari 0';
  }
  return errors;
}

function draftFromTransaction(tx: ApiTransaction): TransactionDraft {
  const nominal = tx.nominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const hargaSatuan =
    tx.hargaSatuan != null
      ? tx.hargaSatuan.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : '';
  return {
    id: tx._id,
    jenis: tx.jenis,
    kategori: tx.kategori,
    projectId: tx.projectId ?? null,
    volume: tx.volume != null ? String(tx.volume) : '',
    satuan: tx.satuan ?? '',
    hargaSatuan,
    nominal,
    tanggal: tx.tanggal,
    keterangan: tx.keterangan ?? '',
  };
}

export function useTransactionBatchController(
  rabItems: RabItem[],
  addTransaction: (data: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>) => Promise<unknown>,
  updateTransaction: (id: string, data: Partial<ApiTransaction>) => Promise<unknown>
) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drafts, setDrafts] = useState<TransactionDraft[]>([createEmptyDraft()]);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [stage, setStage] = useState<'input' | 'confirm'>('input');
  const [submitting, setSubmitting] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<AllDraftErrors>({});
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [submitResults, setSubmitResults] = useState<{ success: number; failed: number } | null>(null);

  const openForCreate = () => {
    const firstDraft = createEmptyDraft();
    setDrafts([firstDraft]);
    setExpandedDraftId(firstDraft.id);
    setStage('input');
    setEditingTransactionId(null);
    setDraftErrors({});
    setSubmitResults(null);
    setDialogOpen(true);
  };

  const openForEdit = (tx: ApiTransaction) => {
    const draft = draftFromTransaction(tx);
    setDrafts([draft]);
    setExpandedDraftId(draft.id);
    setStage('input');
    setEditingTransactionId(tx._id);
    setDraftErrors({});
    setSubmitResults(null);
    setDialogOpen(true);
  };

  const hasAnyDraftContent = (currentDrafts: TransactionDraft[]) =>
    currentDrafts.some((d) => d.kategori || d.nominal || d.keterangan);

  const requestClose = () => {
    if (hasAnyDraftContent(drafts) && stage === 'input') {
      setCloseConfirmOpen(true);
    } else {
      closeDialog();
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCloseConfirmOpen(false);
  };

  const updateDraftField = (id: string, field: keyof TransactionDraft, value: string) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const nextValue = field === 'tanggal' ? normalizeDateInputValue(value) : value;
        const updated = { ...d, [field]: nextValue };

        if (field === 'volume' || field === 'hargaSatuan') {
          const vol = parseQuantityNumber(field === 'volume' ? nextValue : d.volume);
          const harga = parseCurrencyNumber(field === 'hargaSatuan' ? nextValue : d.hargaSatuan);
          if (vol > 0 && harga > 0) {
            updated.nominal = formatNumber(String(Math.round(vol * harga)));
          }
        }

        if (field === 'nominal') {
          updated.nominal = formatNumber(value);
        }

        if (field === 'hargaSatuan') {
          updated.hargaSatuan = formatNumber(value);
        }

        return updated;
      })
    );
    setDraftErrors((prev) => {
      const draftErrs = { ...(prev[id] ?? {}) };
      delete draftErrs[field];
      return { ...prev, [id]: draftErrs };
    });
  };

  const expandDraft = (id: string) => {
    setExpandedDraftId((current) => (current === id ? null : id));
  };

  const addDraft = () => {
    const activeDraft = drafts.find((d) => d.id === expandedDraftId);
    if (activeDraft) {
      const errors = validateDraft(activeDraft);
      if (Object.keys(errors).length > 0) {
        setDraftErrors((prev) => ({ ...prev, [activeDraft.id]: errors }));
        return;
      }
    }
    const newDraft = createEmptyDraft();
    setDrafts((prev) => [...prev, newDraft]);
    setExpandedDraftId(newDraft.id);
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const remaining = prev.filter((d) => d.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyDraft();
        setExpandedDraftId(fresh.id);
        return [fresh];
      }
      if (expandedDraftId === id) {
        setExpandedDraftId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
    setDraftErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const goToConfirm = () => {
    const allErrors: AllDraftErrors = {};
    let hasErrors = false;
    for (const draft of drafts) {
      const errors = validateDraft(draft);
      if (Object.keys(errors).length > 0) {
        allErrors[draft.id] = errors;
        hasErrors = true;
      }
    }
    if (hasErrors) {
      setDraftErrors(allErrors);
      const firstErrorId = Object.keys(allErrors)[0];
      setExpandedDraftId(firstErrorId);
      return;
    }
    setStage('confirm');
  };

  const goBackToInput = () => setStage('input');

  const getRabLinkForDraft = (draft: TransactionDraft) => {
    const suggestions = suggestRabItemsForTransaction({
      items: rabItems,
      transaction: { jenis: draft.jenis, kategori: draft.kategori, keterangan: draft.keterangan },
    });
    const best = suggestions[0];
    if (!best || best.score < MIN_AUTO_RAB_LINK_SCORE) return null;
    return {
      projectId: best.item.projectId,
      rabCategoryId: best.item.categoryId,
      rabItemId: best.item.id,
    };
  };

  const buildTransactionPayload = (
    draft: TransactionDraft,
    getProjectId: () => string | undefined
  ): Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'> => {
    const rabLink = getRabLinkForDraft(draft);

    return {
      jenis: draft.jenis,
      kategori: draft.kategori,
      nominal: parseCurrencyNumber(draft.nominal),
      tanggal: normalizeDateInputValue(draft.tanggal),
      keterangan: draft.keterangan,
      projectId: rabLink?.projectId ?? draft.projectId ?? getProjectId(),
      rabCategoryId: rabLink?.rabCategoryId ?? null,
      rabItemId: rabLink?.rabItemId ?? null,
      volume: draft.volume ? parseQuantityNumber(draft.volume) : null,
      satuan: draft.satuan || null,
      hargaSatuan: draft.hargaSatuan ? parseCurrencyNumber(draft.hargaSatuan) : null,
    };
  };

  const submitAll = async (getProjectId: () => string | undefined) => {
    setSubmitting(true);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const isEditDraft = i === 0 && editingTransactionId !== null;
      const payload = buildTransactionPayload(draft, getProjectId);

      try {
        if (isEditDraft && editingTransactionId) {
          await updateTransaction(editingTransactionId, payload);
        } else {
          await addTransaction(payload);
        }
        success++;
      } catch {
        failed++;
      }
    }

    setSubmitting(false);
    setSubmitResults({ success, failed });

    if (failed === 0) {
      closeDialog();
    }

    return { success, failed };
  };

  const submitEdit = async (getProjectId: () => string | undefined) => {
    const draft = drafts[0];
    if (!editingTransactionId || !draft) {
      const results = { success: 0, failed: 1 };
      setSubmitResults(results);
      return results;
    }

    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setDraftErrors({ [draft.id]: errors });
      setExpandedDraftId(draft.id);
      setStage('input');
      return { success: 0, failed: 1 };
    }

    setSubmitting(true);
    setDraftErrors({});
    setSubmitResults(null);

    try {
      await updateTransaction(editingTransactionId, buildTransactionPayload(draft, getProjectId));
      const results = { success: 1, failed: 0 };
      setSubmitResults(results);
      closeDialog();
      return results;
    } catch {
      const results = { success: 0, failed: 1 };
      setSubmitResults(results);
      return results;
    } finally {
      setSubmitting(false);
    }
  };

  const expandedDraft = drafts.find((d) => d.id === expandedDraftId);
  const rabSuggestion = useMemo(() => {
    if (!expandedDraft) return null;
    const suggestions = suggestRabItemsForTransaction({
      items: rabItems,
      transaction: {
        jenis: expandedDraft.jenis,
        kategori: expandedDraft.kategori,
        keterangan: expandedDraft.keterangan,
      },
    });
    const best = suggestions[0];
    if (!best || best.score < MIN_AUTO_RAB_LINK_SCORE) return null;
    return `${best.item.categoryName ?? 'Kategori RAB'} - ${best.item.name}`;
  }, [expandedDraft, rabItems]);

  return {
    dialogOpen,
    drafts,
    expandedDraftId,
    stage,
    submitting,
    editingTransactionId,
    draftErrors,
    closeConfirmOpen,
    submitResults,
    openForCreate,
    openForEdit,
    requestClose,
    closeDialog,
    setCloseConfirmOpen,
    updateDraftField,
    expandDraft,
    addDraft,
    removeDraft,
    goToConfirm,
    goBackToInput,
    submitAll,
    submitEdit,
    rabSuggestion,
    getRabLinkForDraft,
  };
}

export type UseTransactionBatchControllerResult = ReturnType<typeof useTransactionBatchController>;
