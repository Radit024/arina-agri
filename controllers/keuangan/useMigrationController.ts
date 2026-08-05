'use client';

import { useCallback, useState } from 'react';

import { useUnclassifiedTransactions } from '@/hooks/useUnclassifiedTransactions';
import { migrationApi, type ApiTransaction } from '@/lib/api';

export interface UseMigrationControllerProps {
  projectId: string | null;
  onSuccess?: () => void;
}

export interface UseMigrationControllerResult {
  unclassifiedTransactions: ApiTransaction[];
  unclassifiedCount: number;
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  openDialog: () => void;
  closeDialog: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  handleClassifyTransactions: (
    transactionIds: string[],
    targetScenarioId: string,
  ) => Promise<{ successCount: number; failCount: number }>;
  handleUnclassifyTransaction: (
    transactionId: string,
    currentScenarioId: string,
  ) => Promise<void>;
  reloadUnclassified: () => Promise<void>;
}

export function useMigrationController({
  projectId,
  onSuccess,
}: UseMigrationControllerProps): UseMigrationControllerResult {
  const { unclassified, count, loading, error, reload } = useUnclassifiedTransactions(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openDialog = useCallback(() => {
    setSubmitError(null);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleClassifyTransactions = useCallback(
    async (transactionIds: string[], targetScenarioId: string) => {
      if (!projectId || transactionIds.length === 0) {
        return { successCount: 0, failCount: 0 };
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const result = await migrationApi.classifyTransactions(
          projectId,
          transactionIds,
          targetScenarioId,
        );
        await reload();
        onSuccess?.();
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Gagal mengklasifikasikan transaksi';
        setSubmitError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, projectId, reload],
  );

  const handleUnclassifyTransaction = useCallback(
    async (transactionId: string, currentScenarioId: string) => {
      if (!projectId) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await migrationApi.unclassifyTransaction(projectId, transactionId, currentScenarioId);
        await reload();
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Gagal membatalkan klasifikasi transaksi';
        setSubmitError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, projectId, reload],
  );

  return {
    unclassifiedTransactions: unclassified,
    unclassifiedCount: count,
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    openDialog,
    closeDialog,
    isSubmitting,
    submitError,
    handleClassifyTransactions,
    handleUnclassifyTransaction,
    reloadUnclassified: reload,
  };
}
