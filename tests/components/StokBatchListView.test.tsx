import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { UseFormReturn } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import StokBatchListView, {
  type StokBatchListViewProps,
} from '@/app/dashboard/stok/_components/StokBatchListView';
import type { StockTranslator } from '@/app/dashboard/stok/_components/stockChips';
import type { ApiHarvestBatch } from '@/lib/api';
import type {
  StockOutFormInput,
  StockOutFormOutput,
} from '@/lib/validators/stockSchemas';
import messages from '@/messages/id.json';

const theme = createTheme();

const stockMessages = messages.Stock as Record<string, unknown>;

function readPath(path: string): string {
  const value = path.split('.').reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
    stockMessages,
  );
  return typeof value === 'string' ? value : path;
}

function translate(key: string, values?: Record<string, string | number>): string {
  const template = readPath(key);
  if (!values) return template;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

const t = translate as unknown as StockTranslator;

const batchAman: ApiHarvestBatch = {
  _id: 'batch-aman',
  batchCode: 'BCH-2026-001',
  tanggalPanen: '2026-06-01',
  grade: 'A',
  beratMasuk: 100,
  stokTersisa: 70,
  hargaModal: 15000,
  hargaJual: 30000,
  lokasiPenyimpanan: 'Gudang Utama',
  estimasiKadaluarsa: '2026-06-15',
  catatan: '',
  status: 'aman',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const batchMenipis: ApiHarvestBatch = {
  ...batchAman,
  _id: 'batch-menipis',
  batchCode: 'BCH-2026-002',
  grade: 'B',
  stokTersisa: 15,
  lokasiPenyimpanan: 'Gudang Samping',
  status: 'menipis',
};

const batchTanpaHargaJual: ApiHarvestBatch = {
  ...batchAman,
  _id: 'batch-tanpa-harga',
  batchCode: 'BCH-2026-003',
  stokTersisa: 100,
  hargaJual: 0,
  status: 'habis',
};

function makeStockOutForm() {
  const setValue = vi.fn();
  const stockOutForm = {
    setValue,
  } as unknown as UseFormReturn<StockOutFormInput, unknown, StockOutFormOutput>;
  return { setValue, stockOutForm };
}

function renderView(overrides: Partial<StokBatchListViewProps> = {}) {
  const { stockOutForm } = makeStockOutForm();
  const props: StokBatchListViewProps = {
    activeBatches: [],
    isMobile: false,
    loading: false,
    onCloseBatch: vi.fn(),
    openAddBatch: vi.fn(),
    setStockOutDialogOpen: vi.fn(),
    stockOutForm,
    t,
    ...overrides,
  };

  render(
    <ThemeProvider theme={theme}>
      <StokBatchListView {...props} />
    </ThemeProvider>,
  );
}

describe('StokBatchListView', () => {
  it('shows a loading message instead of the empty state while batches are still loading', () => {
    renderView({ activeBatches: [], loading: true });

    expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    expect(screen.queryByText('Belum ada data batch stok.')).not.toBeInTheDocument();
  });

  it('invites the farmer to register a first batch when no batch exists yet', () => {
    const openAddBatch = vi.fn();
    renderView({ activeBatches: [], openAddBatch });

    expect(screen.getByText('Belum ada data batch stok.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Batch Pertama' }));
    expect(openAddBatch).toHaveBeenCalledTimes(1);
  });

  it('shows a loading message instead of the empty state on narrow screens', () => {
    renderView({ activeBatches: [], isMobile: true, loading: true });

    expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    expect(screen.queryByText('Belum ada data batch stok.')).not.toBeInTheDocument();
  });

  it('invites the farmer to register a first batch on narrow screens', () => {
    const openAddBatch = vi.fn();
    renderView({ activeBatches: [], isMobile: true, openAddBatch });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Belum ada data batch stok.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Batch Pertama' }));
    expect(openAddBatch).toHaveBeenCalledTimes(1);
  });

  it('names every column the farmer reads on a wide screen', () => {
    renderView({ activeBatches: [batchAman] });

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'ID Batch',
      'Tgl Masuk',
      'Grade',
      'Berat Awal',
      'Stok Tersisa',
      'Harga Jual/kg',
      'Progress BEP',
      'Lokasi',
      'Kadaluarsa',
      'Status',
      'Aksi',
    ]);
  });

  it('lists every batch with its code, entry weight, and weight left', () => {
    renderView({ activeBatches: [batchAman, batchMenipis] });

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);

    expect(within(rows[1]).getByText('BCH-2026-001')).toBeInTheDocument();
    expect(within(rows[1]).getByText('100 kg')).toBeInTheDocument();
    expect(within(rows[1]).getByText('70 kg')).toBeInTheDocument();

    expect(within(rows[2]).getByText('BCH-2026-002')).toBeInTheDocument();
    expect(within(rows[2]).getByText('15 kg')).toBeInTheDocument();
  });

  it('stacks each batch as its own card instead of a table on narrow screens', () => {
    renderView({ activeBatches: [batchAman], isMobile: true });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('BCH-2026-001')).toBeInTheDocument();
    expect(screen.getByText('70 kg / 100 kg')).toBeInTheDocument();
    expect(screen.getByText('Gudang Utama')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Catat Keluar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tutup batch' })).toBeInTheDocument();
  });

  it('flags a nearly depleted batch so the farmer notices it before it runs out', () => {
    renderView({ activeBatches: [batchMenipis, batchAman] });

    const [, depletedRow, healthyRow] = screen.getAllByRole('row');

    expect(within(depletedRow).getByText('Menipis')).toBeInTheDocument();
    expect(within(depletedRow).getByText('15 kg')).toHaveStyle({
      color: theme.palette.error.dark,
    });

    expect(within(healthyRow).getByText('Aman')).toBeInTheDocument();
    expect(within(healthyRow).getByText('70 kg')).toHaveStyle({
      color: theme.palette.success.dark,
    });
  });

  it('fills the break-even bar with the share of the batch that has been sold', () => {
    renderView({ activeBatches: [batchAman] });

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    expect(within(row).getByText('20.0 kg')).toBeInTheDocument();
  });

  it('leaves the break-even column blank when a batch has no selling price', () => {
    renderView({ activeBatches: [batchTanpaHargaJual] });

    const row = screen.getAllByRole('row')[1];
    expect(within(row).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(row).getByText('—')).toBeInTheDocument();
  });

  it('explains the missing break-even bar on narrow screens when a batch has no selling price', () => {
    renderView({ activeBatches: [batchTanpaHargaJual], isMobile: true });

    expect(screen.getByText('Isi harga jual untuk melihat BEP')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('tells the farmer how far the batch is from breaking even and the profit it could still make', () => {
    renderView({ activeBatches: [batchAman], isMobile: true });

    expect(screen.getByText('Progress BEP')).toBeInTheDocument();
    expect(screen.getByText('20.0 kg lagi untuk balik modal')).toBeInTheDocument();
    expect(screen.getByText('Estimasi laba jika habis:')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?1\.050\.000/)).toBeInTheDocument();
  });

  it('opens the stock-out flow for the batch whose action was pressed', () => {
    const { setValue, stockOutForm } = makeStockOutForm();
    const setStockOutDialogOpen = vi.fn();
    renderView({ activeBatches: [batchAman, batchMenipis], setStockOutDialogOpen, stockOutForm });

    const secondRow = screen.getAllByRole('row')[2];
    fireEvent.click(within(secondRow).getByRole('button', { name: 'Ship batch' }));

    expect(setValue).toHaveBeenCalledWith('batchId', 'batch-menipis');
    expect(setStockOutDialogOpen).toHaveBeenCalledWith(true);
  });

  it('asks to close only the batch whose close action was pressed', () => {
    const onCloseBatch = vi.fn();
    renderView({ activeBatches: [batchAman, batchMenipis], onCloseBatch });

    const firstRow = screen.getAllByRole('row')[1];
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Tutup batch' }));

    expect(onCloseBatch).toHaveBeenCalledTimes(1);
    expect(onCloseBatch).toHaveBeenCalledWith('batch-aman');
  });

  it('routes both actions on a narrow-screen card to the batch that card belongs to', () => {
    const { setValue, stockOutForm } = makeStockOutForm();
    const setStockOutDialogOpen = vi.fn();
    const onCloseBatch = vi.fn();
    renderView({
      activeBatches: [batchAman, batchMenipis],
      isMobile: true,
      onCloseBatch,
      setStockOutDialogOpen,
      stockOutForm,
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Catat Keluar' })[1]);
    expect(setValue).toHaveBeenCalledWith('batchId', 'batch-menipis');
    expect(setStockOutDialogOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getAllByRole('button', { name: 'Tutup batch' })[1]);
    expect(onCloseBatch).toHaveBeenCalledTimes(1);
    expect(onCloseBatch).toHaveBeenCalledWith('batch-menipis');
  });
});
