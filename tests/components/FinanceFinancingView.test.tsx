import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinanceFinancingView from '@/app/dashboard/keuangan/_components/FinanceFinancingView';
import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

function makeFinancing(overrides: Partial<UseFinancingControllerResult> = {}): UseFinancingControllerResult {
  return {
    assumptions: null,
    loading: false,
    error: null,
    kebutuhanModalKerja: 18_869_000,
    bunga: null,
    arusKasPascaPembiayaan: [],
    kasAkhirPascaPembiayaan: null,
    dialogOpen: false,
    draft: {
      saldoKasAwal: '', modalSendiri: '', nilaiPinjaman: '', bungaPerPeriode: '',
      tanggalPencairan: '', tanggalPembayaran: '', biayaLain: '',
    },
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    updateDraftField: vi.fn(),
    submitDraft: vi.fn(),
    saving: false,
    saveError: null,
    ...overrides,
  };
}

function renderView(financing = makeFinancing()) {
  return {
    financing,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <FinanceFinancingView financing={financing} />
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

  it('shows a call-to-action instead of Bunga/Kas Akhir when assumptions are missing', () => {
    renderView();

    expect(screen.getAllByText(/Atur Asumsi Pembiayaan/i).length).toBeGreaterThan(0);
  });

  it('opens the dialog when the CTA button is clicked', () => {
    const financing = makeFinancing();
    renderView(financing);

    fireEvent.click(screen.getAllByRole('button', { name: /Atur Asumsi Pembiayaan/i })[0]);

    expect(financing.openDialog).toHaveBeenCalled();
  });

  it('renders Bunga, Kas Akhir Pasca Pembiayaan, and the monthly table once assumptions exist', () => {
    renderView(makeFinancing({
      bunga: 450_000,
      kasAkhirPascaPembiayaan: 22_891_000,
      arusKasPascaPembiayaan: [
        { bulan: '2026-07', kasSetelahPembiayaan: -7_412_500, kasKumulatifSetelahPembiayaan: -7_412_500 },
        { bulan: '2026-12', kasSetelahPembiayaan: 30_050_000, kasKumulatifSetelahPembiayaan: 22_891_000 },
      ],
    }));

    expect(screen.getByText(/Rp\s?450\.000/)).toBeInTheDocument();
    // Kas Akhir Pasca Pembiayaan equals the last row's cumulative value by
    // definition, so it legitimately renders twice (summary card + table row).
    expect(screen.getAllByText(/Rp\s?22\.891\.000/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('2026-07')).toBeInTheDocument();
    expect(screen.getByText('2026-12')).toBeInTheDocument();
  });
});
