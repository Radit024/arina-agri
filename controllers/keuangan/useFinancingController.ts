'use client';

import { useMemo, useState } from 'react';

import { useFinancingAssumptions } from '@/hooks/useFinancingAssumptions';
import { toMonthKey } from '@/lib/finance/rabCalculations';
import {
  computeArusKasPascaPembiayaan,
  computeBunga,
  computeKebutuhanModalKerja,
} from '@/lib/finance/scenarioCalculations';
import type { ArusKasBulanan, FinancingAssumptions } from '@/lib/finance/rabTypes';

type FinancingDraft = {
  saldoKasAwal: string;
  modalSendiri: string;
  nilaiPinjaman: string;
  bungaPerPeriode: string;
  tanggalPencairan: string;
  tanggalPembayaran: string;
  biayaLain: string;
};

const EMPTY_DRAFT: FinancingDraft = {
  saldoKasAwal: '',
  modalSendiri: '',
  nilaiPinjaman: '',
  bungaPerPeriode: '',
  tanggalPencairan: '',
  tanggalPembayaran: '',
  biayaLain: '',
};

function draftFromAssumptions(assumptions: FinancingAssumptions | null): FinancingDraft {
  if (!assumptions) return EMPTY_DRAFT;
  return {
    saldoKasAwal: String(assumptions.saldoKasAwal),
    modalSendiri: String(assumptions.modalSendiri),
    nilaiPinjaman: String(assumptions.nilaiPinjaman),
    bungaPerPeriode: String(assumptions.bungaPerPeriode),
    tanggalPencairan: assumptions.tanggalPencairan ? toMonthKey(assumptions.tanggalPencairan) : '',
    tanggalPembayaran: assumptions.tanggalPembayaran ? toMonthKey(assumptions.tanggalPembayaran) : '',
    biayaLain: String(assumptions.biayaLain),
  };
}

function validateDraft(draft: FinancingDraft): string | null {
  const nilaiPinjaman = Number(draft.nilaiPinjaman) || 0;
  const bungaPerPeriode = Number(draft.bungaPerPeriode) || 0;
  const biayaLain = Number(draft.biayaLain) || 0;
  const saldoKasAwal = Number(draft.saldoKasAwal) || 0;
  const modalSendiri = Number(draft.modalSendiri) || 0;

  if (nilaiPinjaman < 0 || bungaPerPeriode < 0 || biayaLain < 0 || saldoKasAwal < 0 || modalSendiri < 0) {
    return 'Nilai pinjaman, bunga, biaya lain, saldo kas awal, dan modal sendiri tidak boleh negatif';
  }
  if (draft.tanggalPencairan && draft.tanggalPembayaran && draft.tanggalPembayaran < draft.tanggalPencairan) {
    return 'Tanggal pembayaran tidak boleh sebelum tanggal pencairan';
  }
  return null;
}

export function useFinancingController({
  scenarioId,
  arusKasBulanan,
}: {
  scenarioId: string | null;
  arusKasBulanan: ArusKasBulanan[];
}) {
  const { assumptions, loading, error, save } = useFinancingAssumptions(scenarioId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<FinancingDraft>(EMPTY_DRAFT);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const kebutuhanModalKerja = useMemo(
    () => computeKebutuhanModalKerja(arusKasBulanan),
    [arusKasBulanan],
  );

  const bunga = assumptions ? computeBunga(assumptions.nilaiPinjaman, assumptions.bungaPerPeriode) : null;

  const arusKasPascaPembiayaan = useMemo(() => {
    if (!assumptions) return [];
    return computeArusKasPascaPembiayaan(arusKasBulanan, {
      nilaiPinjaman: assumptions.nilaiPinjaman,
      bungaPerPeriode: assumptions.bungaPerPeriode,
      biayaLain: assumptions.biayaLain,
      pencairanBulan: assumptions.tanggalPencairan ? toMonthKey(assumptions.tanggalPencairan) : '',
      pembayaranBulan: assumptions.tanggalPembayaran ? toMonthKey(assumptions.tanggalPembayaran) : '',
    });
  }, [assumptions, arusKasBulanan]);

  const kasAkhirPascaPembiayaan = assumptions && arusKasPascaPembiayaan.length > 0
    ? arusKasPascaPembiayaan[arusKasPascaPembiayaan.length - 1].kasKumulatifSetelahPembiayaan
    : null;

  const openDialog = () => {
    setSaveError(null);
    setDraft(draftFromAssumptions(assumptions));
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const updateDraftField = (field: keyof FinancingDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const submitDraft = async () => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await save({
        saldoKasAwal: Number(draft.saldoKasAwal) || 0,
        modalSendiri: Number(draft.modalSendiri) || 0,
        nilaiPinjaman: Number(draft.nilaiPinjaman) || 0,
        bungaPerPeriode: Number(draft.bungaPerPeriode) || 0,
        tanggalPencairan: draft.tanggalPencairan ? `${draft.tanggalPencairan}-01` : '',
        tanggalPembayaran: draft.tanggalPembayaran ? `${draft.tanggalPembayaran}-01` : '',
        biayaLain: Number(draft.biayaLain) || 0,
      });
      setDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan asumsi pembiayaan');
    } finally {
      setSaving(false);
    }
  };

  return {
    assumptions,
    loading,
    error,
    kebutuhanModalKerja,
    bunga,
    arusKasPascaPembiayaan,
    kasAkhirPascaPembiayaan,
    dialogOpen,
    draft,
    openDialog,
    closeDialog,
    updateDraftField,
    submitDraft,
    saving,
    saveError,
  };
}

export type UseFinancingControllerResult = ReturnType<typeof useFinancingController>;
