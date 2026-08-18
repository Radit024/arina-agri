import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceFinancingView, {
  type FinanceFinancingViewProps,
} from '@/app/dashboard/keuangan/_components/FinanceFinancingView';

function makeProps(overrides: Partial<FinanceFinancingViewProps> = {}): FinanceFinancingViewProps {
  return {
    arusKasPascaPembiayaan: [],
    bunga: null,
    kasAkhirPascaPembiayaan: null,
    kebutuhanModalKerja: 18_869_000,
    onOpenAssumptions: vi.fn(),
    ...overrides,
  };
}

function renderView(props = makeProps()) {
  return {
    props,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <FinanceFinancingView {...props} />
      </ThemeProvider>,
    ),
  };
}

describe('FinanceFinancingView', () => {
  it('always shows Kebutuhan Modal Kerja even without financing assumptions', () => {
    renderView();

    expect(screen.getByText(/Kebutuhan Modal Kerja/i)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?18\.869\.000/)).toBeInTheDocument();
  });

  it('shows exactly one financing assumptions CTA and non-action KPI placeholders when assumptions are missing', () => {
    renderView();

    expect(screen.getAllByRole('button', { name: 'Atur Asumsi Pembiayaan' })).toHaveLength(1);
    expect(screen.getAllByText('Belum diatur')).toHaveLength(2);
  });

  it('opens the dialog once when the financing assumptions CTA is clicked', () => {
    const onOpenAssumptions = vi.fn();
    renderView(makeProps({ onOpenAssumptions }));

    fireEvent.click(screen.getByRole('button', { name: 'Atur Asumsi Pembiayaan' }));

    expect(onOpenAssumptions).toHaveBeenCalledTimes(1);
  });

  it('renders Bunga, Kas Akhir, mobile cards, and the desktop monthly table once assumptions exist', () => {
    renderView(makeProps({
      bunga: 450_000,
      kasAkhirPascaPembiayaan: 22_891_000,
      arusKasPascaPembiayaan: [
        { bulan: '2026-07', kasSetelahPembiayaan: -7_412_500, kasKumulatifSetelahPembiayaan: -7_412_500 },
        { bulan: '2026-12', kasSetelahPembiayaan: 30_050_000, kasKumulatifSetelahPembiayaan: 22_891_000 },
      ],
    }));

    expect(screen.getByText(/Rp\s?450\.000/)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Arus kas pasca pembiayaan Juli 2026' })).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Tabel arus kas pasca pembiayaan' });
    expect(within(table).getByText('Juli 2026')).toBeInTheDocument();
    expect(within(table).getAllByText(/Rp\s?7\.412\.500/)).toHaveLength(2);
    expect(within(table).getByText('Desember 2026')).toBeInTheDocument();
    expect(within(table).getByText(/Rp\s?30\.050\.000/)).toBeInTheDocument();
  });

  it('shows the financed cash flow empty state without stale table or mobile-card content', () => {
    renderView(makeProps({
      bunga: 0,
      kasAkhirPascaPembiayaan: 0,
      arusKasPascaPembiayaan: [],
    }));

    expect(screen.getByRole('status')).toHaveTextContent('Belum ada proyeksi pembiayaan');
    expect(screen.getByRole('status')).toHaveTextContent('Belum ada proyeksi arus kas setelah pembiayaan.');
    expect(screen.queryByRole('table', { name: 'Tabel arus kas pasca pembiayaan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
