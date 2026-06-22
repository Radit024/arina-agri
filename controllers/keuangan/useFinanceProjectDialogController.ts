'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatDateInputValue, isValidDateInputValue, normalizeDateInputValue } from '@/lib/formatters';
import type { ApiFinanceProject } from '@/lib/api';
import type { UseFinanceProjectControllerResult } from './useFinanceProjectController';

type FinanceProjectDialogControllerInput = Pick<
  UseFinanceProjectControllerResult,
  'createProject' | 'projectDialogOpen' | 'setProjectDialogOpen'
>;

export type FinanceProjectDialogForm = {
  name: string;
  commodity: string;
  landArea: string;
  landAreaUnit: string;
  seasonLabel: string;
  startDate: string;
  endDate: string;
  status: ApiFinanceProject['status'];
  landBlock: string;
  variety: string;
  cultivationMethod: string;
};

export type FinanceProjectDialogTextField = Exclude<keyof FinanceProjectDialogForm, 'status'>;

export function defaultFinanceProjectDialogForm(): FinanceProjectDialogForm {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString().slice(0, 10);

  return {
    name: '',
    commodity: '',
    landArea: '1',
    landAreaUnit: 'Ha',
    seasonLabel: '',
    startDate,
    endDate,
    status: 'active',
    landBlock: '',
    variety: '',
    cultivationMethod: '',
  };
}

function appendDetail(base: string, detail: string) {
  const cleanBase = base.trim();
  const cleanDetail = detail.trim();
  if (!cleanDetail) return cleanBase;
  if (!cleanBase) return cleanDetail;
  if (cleanBase.toLowerCase().includes(cleanDetail.toLowerCase())) return cleanBase;
  return `${cleanBase} - ${cleanDetail}`;
}

function appendParenthetical(base: string, detail: string) {
  const cleanBase = base.trim();
  const cleanDetail = detail.trim();
  if (!cleanDetail) return cleanBase;
  if (!cleanBase) return cleanDetail;
  if (cleanBase.toLowerCase().includes(cleanDetail.toLowerCase())) return cleanBase;
  return `${cleanBase} (${cleanDetail})`;
}

export function buildFinanceProjectDialogPayload(
  form: FinanceProjectDialogForm,
): Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: appendDetail(form.name, form.landBlock),
    commodity: appendParenthetical(form.commodity, form.variety),
    landArea: Number(form.landArea) || 1,
    landAreaUnit: form.landAreaUnit.trim() || 'Ha',
    seasonLabel: appendDetail(form.seasonLabel, form.cultivationMethod),
    startDate: normalizeDateInputValue(form.startDate),
    endDate: normalizeDateInputValue(form.endDate),
    status: form.status,
  };
}

export function useFinanceProjectDialogController(financeProject: FinanceProjectDialogControllerInput) {
  const [form, setForm] = useState(defaultFinanceProjectDialogForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (financeProject.projectDialogOpen) {
      setForm(defaultFinanceProjectDialogForm());
      setSubmitting(false);
    }
  }, [financeProject.projectDialogOpen]);

  const startDateValid = isValidDateInputValue(form.startDate);
  const endDateValid = isValidDateInputValue(form.endDate);
  const canSubmit = Boolean(form.name.trim() && form.commodity.trim() && startDateValid && endDateValid);

  const dateDisplayValues = useMemo(
    () => ({
      startDate: formatDateInputValue(form.startDate),
      endDate: formatDateInputValue(form.endDate),
    }),
    [form.endDate, form.startDate],
  );

  const setField = (field: FinanceProjectDialogTextField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setDateField = (field: 'startDate' | 'endDate', value: string) => {
    setForm((prev) => ({ ...prev, [field]: normalizeDateInputValue(value) }));
  };

  const setStatus = (status: ApiFinanceProject['status']) => {
    setForm((prev) => ({ ...prev, status }));
  };

  const close = () => {
    financeProject.setProjectDialogOpen(false);
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await financeProject.createProject(buildFinanceProjectDialogPayload(form));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    submitting,
    startDateValid,
    endDateValid,
    canSubmit,
    dateDisplayValues,
    setField,
    setDateField,
    setStatus,
    close,
    submit,
  };
}
