'use client';

import { useMemo } from 'react';

import { suggestRabItemsForTransaction } from '@/lib/finance/rabSuggestionMatcher';
import type { ApiTransaction } from '@/lib/api';
import type { RabItem } from '@/lib/finance/rabTypes';

export function useFinanceLedgerController({
  rabItems,
  selectedJenis,
  selectedKategori,
  selectedKeterangan,
}: {
  rabItems: RabItem[];
  selectedJenis: ApiTransaction['jenis'];
  selectedKategori: string;
  selectedKeterangan: string;
}) {
  const suggestions = useMemo(
    () =>
      suggestRabItemsForTransaction({
        items: rabItems,
        transaction: {
          jenis: selectedJenis,
          kategori: selectedKategori,
          keterangan: selectedKeterangan,
        },
      }),
    [rabItems, selectedJenis, selectedKategori, selectedKeterangan],
  );

  return {
    rabSuggestions: suggestions,
  };
}

export type UseFinanceLedgerControllerResult = ReturnType<typeof useFinanceLedgerController>;
