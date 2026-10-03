import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import StokMutationsView, {
  type StokMutationsViewProps,
} from '@/app/dashboard/stok/_components/StokMutationsView';
import type { StockTranslator } from '@/app/dashboard/stok/_components/stockChips';
import type { ApiGrade, ApiStockMutation } from '@/lib/api';

const theme = createTheme();

const MESSAGES: Record<string, string> = {
  'mutationTable.filterGrade': 'Filter Grade',
  'mutationTable.allGrades': 'Semua Grade',
  'mutationTable.date': 'Tanggal',
  'mutationTable.batch': 'Batch',
  'mutationTable.type': 'Tipe',
  'mutationTable.weight': 'Berat',
  'mutationTable.target': 'Tujuan',
  'mutationTable.note': 'Catatan',
  'mutationTable.in': 'Masuk',
  'mutationTable.out': 'Keluar',
};

function translate(key: string): string {
  return MESSAGES[key] ?? key;
}

const t = translate as unknown as StockTranslator;

const grades: ApiGrade[] = [
  { id: 'grade-a', nama: 'A', urutan: 1 },
  { id: 'grade-b', nama: 'B', urutan: 2 },
];

const entryMasuk: ApiStockMutation = {
  _id: 'mutasi-1',
  batchId: 'batch-aman',
  batchCode: 'BCH-2026-001',
  tipe: 'masuk',
  berat: 100,
  tanggal: '2026-06-01',
  catatan: 'Panen pagi',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const entryKeluar: ApiStockMutation = {
  _id: 'mutasi-2',
  batchId: 'batch-aman',
  batchCode: 'BCH-2026-001',
  tipe: 'keluar',
  berat: 30,
  tujuan: 'Pasar Lokal',
  tanggal: '2026-06-08',
  catatan: '',
  createdAt: '2026-06-08T00:00:00.000Z',
};

function renderView(overrides: Partial<StokMutationsViewProps> = {}) {
  const props: StokMutationsViewProps = {
    filteredMutations: [],
    grades,
    isMobile: false,
    mutFilter: 'semua',
    mutFromDate: '',
    mutFromDateInvalid: false,
    mutToDate: '',
    mutToDateInvalid: false,
    onApplyDateFilter: vi.fn(),
    onResetDateFilter: vi.fn(),
    setMutFilter: vi.fn(),
    setMutFromDate: vi.fn(),
    setMutToDate: vi.fn(),
    t,
    ...overrides,
  };

  render(
    <ThemeProvider theme={theme}>
      <StokMutationsView {...props} />
    </ThemeProvider>,
  );
}

describe('StokMutationsView', () => {
  it('lists every grade plus the unfiltered choice so the ledger can be narrowed', () => {
    renderView();

    fireEvent.mouseDown(screen.getByRole('combobox'));

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Semua Grade', 'A', 'B']);
  });

  it('reports the grade the farmer picks back to the ledger', () => {
    const setMutFilter = vi.fn();
    renderView({ setMutFilter });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'B' }));

    expect(setMutFilter).toHaveBeenCalledTimes(1);
    expect(setMutFilter).toHaveBeenCalledWith('B');
  });

  it('shows which grade is currently filtering the ledger', () => {
    renderView({ mutFilter: 'B' });

    expect(screen.getByRole('combobox')).toHaveTextContent('B');
  });

  it('shows a stored date range in day-month-year form', () => {
    renderView({ mutFromDate: '2026-06-05', mutToDate: '2026-06-30' });

    expect(screen.getByLabelText('Dari Tanggal')).toHaveValue('05-06-2026');
    expect(screen.getByLabelText('Sampai Tanggal')).toHaveValue('30-06-2026');
  });

  it('reports a typed start date back in stored form', () => {
    const setMutFromDate = vi.fn();
    renderView({ setMutFromDate });

    fireEvent.change(screen.getByLabelText('Dari Tanggal'), { target: { value: '10-06-2026' } });

    expect(setMutFromDate).toHaveBeenCalledWith('2026-06-10');
  });

  it('reports a typed end date back in stored form', () => {
    const setMutToDate = vi.fn();
    renderView({ setMutToDate });

    fireEvent.change(screen.getByLabelText('Sampai Tanggal'), { target: { value: '12-06-2026' } });

    expect(setMutToDate).toHaveBeenCalledWith('2026-06-12');
  });

  it('keeps an incomplete typed date as typed so it can be judged invalid', () => {
    const setMutFromDate = vi.fn();
    renderView({ setMutFromDate });

    fireEvent.change(screen.getByLabelText('Dari Tanggal'), { target: { value: '05-06' } });

    expect(setMutFromDate).toHaveBeenCalledWith('05-06');
  });

  it('refuses to apply the range and explains why while the start date is unreadable', () => {
    const onApplyDateFilter = vi.fn();
    renderView({ mutFromDate: '05-06', mutFromDateInvalid: true, onApplyDateFilter });

    expect(screen.getAllByText('Format tanggal harus dd-MM-yyyy')).toHaveLength(1);
    const apply = screen.getByRole('button', { name: 'Terapkan' });
    expect(apply).toBeDisabled();

    fireEvent.click(apply);
    expect(onApplyDateFilter).not.toHaveBeenCalled();
  });

  it('refuses to apply the range while the end date is unreadable', () => {
    renderView({ mutToDate: '31-02-2026', mutToDateInvalid: true });

    expect(screen.getByText('Format tanggal harus dd-MM-yyyy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terapkan' })).toBeDisabled();
  });

  it('applies the chosen range when both dates are readable', () => {
    const onApplyDateFilter = vi.fn();
    renderView({ mutFromDate: '2026-06-05', mutToDate: '2026-06-30', onApplyDateFilter });

    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(onApplyDateFilter).toHaveBeenCalledTimes(1);
  });

  it('offers nothing to reset while no date has been set', () => {
    renderView({ mutFromDate: '', mutToDate: '' });

    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('lets the farmer clear a range once an end date has been set', () => {
    const onResetDateFilter = vi.fn();
    renderView({ mutFromDate: '', mutToDate: '2026-06-30', onResetDateFilter });

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onResetDateFilter).toHaveBeenCalledTimes(1);
  });

  it('shows each ledger entry with its type, weight, destination, and note', () => {
    renderView({ filteredMutations: [entryMasuk, entryKeluar] });

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Tanggal',
      'Batch',
      'Tipe',
      'Berat',
      'Tujuan',
      'Catatan',
    ]);

    expect(within(rows[1]).getByText('1 Jun 2026')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Masuk')).toBeInTheDocument();
    expect(within(rows[1]).getByText('100 kg')).toBeInTheDocument();
    expect(within(rows[1]).getByText('—')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Panen pagi')).toBeInTheDocument();

    expect(within(rows[2]).getByText('8 Jun 2026')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Keluar')).toBeInTheDocument();
    expect(within(rows[2]).getByText('30 kg')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Pasar Lokal')).toBeInTheDocument();
  });

  it('tells the farmer there is nothing to show when no entry matches on narrow screens', () => {
    renderView({ filteredMutations: [], isMobile: true });

    expect(screen.getByText('Belum ada data mutasi.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('stacks each ledger entry as its own card instead of a table on narrow screens', () => {
    renderView({ filteredMutations: [entryMasuk, entryKeluar], isMobile: true });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(screen.getAllByText('1 Jun 2026')).toHaveLength(1);
    expect(screen.getAllByText('8 Jun 2026')).toHaveLength(1);
    expect(screen.getAllByText('BCH-2026-001')).toHaveLength(2);
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('Masuk')).toBeInTheDocument();
    expect(screen.getByText('Panen pagi')).toBeInTheDocument();
    expect(screen.getByText('Tujuan:')).toBeInTheDocument();
    expect(screen.getByText('Pasar Lokal')).toBeInTheDocument();
  });

  it('leaves out the destination on a narrow entry that has none', () => {
    renderView({ filteredMutations: [entryMasuk], isMobile: true });

    expect(screen.queryByText('Tujuan:')).not.toBeInTheDocument();
  });
});
