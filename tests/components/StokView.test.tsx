import { render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import StokView from '@/app/dashboard/stok/_components/StokView';
import type {
  BatchFormInput,
  BatchFormOutput,
  StockOutFormInput,
  StockOutFormOutput,
} from '@/app/dashboard/stok/_lib/stockSchemas';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useStok', () => ({
  computeBatchPerformance: () => ({
    bepKg: null,
    estimasiLabaJikaHabis: 0,
    sudahBalikModal: false,
    sudahTerjual: 0,
    bepProgress: 0,
    sisaBepKg: 0,
  }),
}));

const theme = createTheme();
const staleBatchId = '790300ba-7b48-410c-8282-d2a8b9a4f8d7';

function StokViewHarness({ stockOutDialogOpen = true }: { stockOutDialogOpen?: boolean } = {}) {
  const batchForm = useForm<BatchFormInput, unknown, BatchFormOutput>({
    defaultValues: {
      tanggalPanen: '2026-06-01',
      grade: 'A',
      lokasiPenyimpanan: 'Gudang Utama',
      estimasiKadaluarsa: '2026-06-15',
      beratMasuk: 0,
      hargaModal: 0,
      hargaJual: 0,
      catatan: '',
    },
  });
  const stockOutForm = useForm<StockOutFormInput, unknown, StockOutFormOutput>({
    defaultValues: {
      batchId: staleBatchId,
      berat: 1,
      tujuan: 'Pasar Lokal',
      tanggal: '2026-06-01',
      catatan: '',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <StokView
        activeBatches={[]}
        alertBatches={[]}
        backendOnline
        batchDialogOpen={false}
        batchForm={batchForm}
        closeConfirmId={null}
        filteredMutations={[]}
        loading={false}
        mutFilter="semua"
        mutFromDate=""
        mutFromDateInvalid={false}
        mutToDate=""
        mutToDateInvalid={false}
        onBatchSubmit={vi.fn()}
        onStockOutSubmit={vi.fn()}
        openAddBatch={vi.fn()}
        onCloseBatch={vi.fn()}
        onConfirmClose={vi.fn()}
        onCancelClose={vi.fn()}
        onApplyDateFilter={vi.fn()}
        onResetDateFilter={vi.fn()}
        setBatchDialogOpen={vi.fn()}
        setMutFilter={vi.fn()}
        setMutFromDate={vi.fn()}
        setMutToDate={vi.fn()}
        setStockOutDialogOpen={vi.fn()}
        setTab={vi.fn()}
        stockOutDialogOpen={stockOutDialogOpen}
        stockOutForm={stockOutForm}
        summary={{
          totalStokSiapJual: 0,
          stokTerjualMingguIni: 0,
          estimasiNilaiStok: 0,
          batchHampirKadaluarsa: 0,
        }}
        tab={0}
        buyers={[]}
        stockOutSelectedBatch={null}
        batchEstimatedValue={0}
        stockOutTotal={0}
        stockOutHargaDiff={null}
        grades={[]}
        locations={[]}
        gradeDialogOpen={false}
        locationDialogOpen={false}
        gradeDeleteError={null}
        locationDeleteError={null}
        setGradeDialogOpen={vi.fn()}
        setLocationDialogOpen={vi.fn()}
        onAddGrade={vi.fn()}
        onRenameGrade={vi.fn()}
        onRemoveGrade={vi.fn()}
        onAddLocation={vi.fn()}
        onRenameLocation={vi.fn()}
        onRemoveLocation={vi.fn()}
        onClearGradeDeleteError={vi.fn()}
        onClearLocationDeleteError={vi.fn()}
        supplyItems={[]}
        supplyLoading={false}
        onAddSupplyItem={vi.fn()}
        onAddSupplyMutation={vi.fn()}
      />
    </ThemeProvider>
  );
}

describe('StokView', () => {
  it('renders the four stock summaries through labelled metric sections', () => {
    render(<StokViewHarness stockOutDialogOpen={false} />);

    const ready = screen.getByRole('region', { name: 'kpi.ready' });
    const sold = screen.getByRole('region', { name: 'kpi.sold' });
    const value = screen.getByRole('region', { name: 'kpi.value' });
    const alert = screen.getByRole('region', { name: 'kpi.alert' });

    expect(within(ready).getByText('0 kg')).toBeInTheDocument();
    expect(within(sold).getByText('0 kg')).toBeInTheDocument();
    expect(within(value).getByText(/Rp\s?0/)).toBeInTheDocument();
    expect(within(alert).getByText('0 batch')).toBeInTheDocument();
  });

  it('does not pass stale batch ids to the stock-out batch select', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<StokViewHarness />);

    const messages = [...consoleError.mock.calls, ...consoleWarn.mock.calls]
      .flat()
      .map(String);

    expect(messages.some((message) => message.includes('out-of-range value'))).toBe(false);

    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});
