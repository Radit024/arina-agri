export type LedgerSortColumn = 'tanggal' | 'kategori' | 'nominal' | 'jenis';

export interface LedgerSortState {
  column: LedgerSortColumn | null;
  dir: 'asc' | 'desc' | null;
}

/**
 * Cycles a column through three clicks: ascending -> descending -> back to
 * no sort (normal order). Clicking a different column always starts at ascending.
 */
export function nextLedgerSortState(current: LedgerSortState, column: LedgerSortColumn): LedgerSortState {
  if (current.column !== column) return { column, dir: 'asc' };
  if (current.dir === 'asc') return { column, dir: 'desc' };
  if (current.dir === 'desc') return { column: null, dir: null };
  return { column, dir: 'asc' };
}
