import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import FinanceFinancingMobileCard from '@/app/dashboard/keuangan/_components/FinanceFinancingMobileCard';

describe('FinanceFinancingMobileCard', () => {
  it('renders a named article with both financed cash flow metrics', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <FinanceFinancingMobileCard
          row={{
            bulan: '2026-07',
            kasSetelahPembiayaan: -7_412_500,
            kasKumulatifSetelahPembiayaan: 22_891_000,
          }}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('article', { name: 'Arus kas pasca pembiayaan Juli 2026' })).toBeInTheDocument();
    expect(screen.getByText('Kas Setelah Pembiayaan')).toBeInTheDocument();
    expect(screen.getByText('Kas Kumulatif Setelah Pembiayaan')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?7\.412\.500/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?22\.891\.000/)).toBeInTheDocument();
  });
});
