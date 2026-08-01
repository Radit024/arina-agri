import { describe, expect, it } from 'vitest';

import { nextLedgerSortState, type LedgerSortState } from '@/controllers/keuangan/ledgerSort';

describe('nextLedgerSortState', () => {
  it('cycles a column through ascending, descending, then back to normal', () => {
    let state: LedgerSortState = { column: null, dir: null };

    const afterFirstClick = nextLedgerSortState(state, 'tanggal');
    expect(afterFirstClick).toEqual({ column: 'tanggal', dir: 'asc' });

    state = afterFirstClick;
    const afterSecondClick = nextLedgerSortState(state, 'tanggal');
    expect(afterSecondClick).toEqual({ column: 'tanggal', dir: 'desc' });

    const afterThirdClick = nextLedgerSortState(afterSecondClick, 'tanggal');
    expect(afterThirdClick).toEqual({ column: null, dir: null });

    const afterFourthClick = nextLedgerSortState(afterThirdClick, 'tanggal');
    expect(afterFourthClick).toEqual({ column: 'tanggal', dir: 'asc' });
  });

  it('starts a newly clicked column at ascending regardless of the previous column state', () => {
    const midCycle = { column: 'tanggal', dir: 'desc' } as const;

    expect(nextLedgerSortState(midCycle, 'kategori')).toEqual({ column: 'kategori', dir: 'asc' });
  });
});
