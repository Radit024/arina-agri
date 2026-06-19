import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTransactionBatchController } from '@/controllers/keuangan/useTransactionBatchController';

describe('useTransactionBatchController', () => {
  it('toggles the active transaction draft when the same draft is clicked again', () => {
    const { result } = renderHook(() => useTransactionBatchController([], vi.fn(), vi.fn()));

    act(() => {
      result.current.openForCreate();
    });

    const firstDraftId = result.current.drafts[0].id;
    expect(result.current.expandedDraftId).toBe(firstDraftId);

    act(() => {
      result.current.expandDraft(firstDraftId);
    });
    expect(result.current.expandedDraftId).toBeNull();

    act(() => {
      result.current.expandDraft(firstDraftId);
    });
    expect(result.current.expandedDraftId).toBe(firstDraftId);
  });
});
