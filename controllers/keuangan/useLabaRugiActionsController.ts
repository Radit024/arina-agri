'use client';

import { useState } from 'react';

import type { RabEntryType } from '@/lib/finance/rabTypes';

/**
 * Simplified read-only controller for the Laba Rugi tab.
 * Edit/delete RAB item actions from the report have been removed (audit §5.3).
 * Only search and filter over the summary figures are retained.
 */
export function useLabaRugiActionsController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'semua' | RabEntryType>('semua');

  return {
    searchQuery,
    setSearchQuery,
    filterJenis,
    setFilterJenis,
  };
}

export type UseLabaRugiActionsControllerResult = ReturnType<typeof useLabaRugiActionsController>;
