'use client';

import { useMemo, useState } from 'react';

import { useProductionSalesAssumptions } from '@/hooks/useProductionSalesAssumptions';
import type { ProductionSalesAssumptions } from '@/lib/finance/rabTypes';

type ProductionSalesDraft = {
  produksi: string;
  satuan: string;
  hargaJual: string;
};

const EMPTY_DRAFT: ProductionSalesDraft = {
  produksi: '',
  satuan: 'kg',
  hargaJual: '',
};

function draftFromAssumptions(assumptions: ProductionSalesAssumptions | null): ProductionSalesDraft {
  if (!assumptions) return EMPTY_DRAFT;
  return {
    produksi: String(assumptions.produksi),
    satuan: assumptions.satuan || 'kg',
    hargaJual: String(assumptions.hargaJual),
  };
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateDraft(draft: ProductionSalesDraft): string | null {
  const produksi = parseNumber(draft.produksi);
  const hargaJual = parseNumber(draft.hargaJual);

  if (produksi === null || hargaJual === null) {
    return 'Volume produksi dan harga jual harus berupa angka yang valid';
  }
  if (produksi < 0 || hargaJual < 0) {
    return 'Volume produksi dan harga jual tidak boleh negatif';
  }
  return null;
}

export function useProductionSalesController({
  scenarioId,
}: {
  scenarioId: string | null;
}) {
  const { assumptions, loading, error, save, reload } = useProductionSalesAssumptions(scenarioId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<ProductionSalesDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validationError = useMemo(() => validateDraft(draft), [draft]);

  const openDialog = () => {
    setDraft(draftFromAssumptions(assumptions));
    setSubmitError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSubmitError(null);
  };

  const updateDraftField = (field: keyof ProductionSalesDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    const err = validateDraft(draft);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await save({
        produksi: parseNumber(draft.produksi) ?? 0,
        satuan: draft.satuan.trim() || 'kg',
        hargaJual: parseNumber(draft.hargaJual) ?? 0,
      });
      setDialogOpen(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Gagal menyimpan asumsi produksi dan penjualan');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    assumptions,
    loading,
    error,
    dialogOpen,
    draft,
    submitting,
    submitError,
    validationError,
    openDialog,
    closeDialog,
    updateDraftField,
    handleSubmit,
    reload,
  };
}

export type UseProductionSalesControllerResult = ReturnType<typeof useProductionSalesController>;
