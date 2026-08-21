import { render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import FinanceComparisonCashFlowMobileCard from '@/app/dashboard/keuangan/_components/FinanceComparisonCashFlowMobileCard';

const theme = createTheme();

function renderCard(
  row: React.ComponentProps<typeof FinanceComparisonCashFlowMobileCard>['row'] = {
    bulan: '2026-06',
    proyeksi: 2_000_000,
    realisasi: -1_500_000,
    selisih: 500_000,
    selisihPercent: 0.25,
  },
) {
  return render(
    <ThemeProvider theme={theme}>
      <FinanceComparisonCashFlowMobileCard row={row} />
    </ThemeProvider>,
  );
}

describe('FinanceComparisonCashFlowMobileCard', () => {
  it('renders a named article with labelled, signed comparison values and percentage', () => {
    renderCard();

    const article = screen.getByRole('article', { name: 'Perbandingan arus kas Juni 2026' });
    expect(within(article).getByText('Proyeksi')).toBeInTheDocument();
    expect(within(article).getByText('Realisasi')).toBeInTheDocument();
    expect(within(article).getByText('Selisih')).toBeInTheDocument();
    expect(within(article).getByText('+Rp 2.000.000')).toBeInTheDocument();
    expect(within(article).getByText('−Rp 1.500.000')).toBeInTheDocument();
    expect(within(article).getByText('+Rp 500.000')).toBeInTheDocument();
    expect(within(article).getByText('+25,0%')).toBeInTheDocument();
  });

  it('renders an em dash when the percentage cannot be compared', () => {
    renderCard({
      bulan: '2026-07',
      proyeksi: 0,
      realisasi: 100_000,
      selisih: 100_000,
      selisihPercent: null,
    });

    const article = screen.getByRole('article', { name: 'Perbandingan arus kas Juli 2026' });
    expect(within(article).getByText('—')).toBeInTheDocument();
  });
});
