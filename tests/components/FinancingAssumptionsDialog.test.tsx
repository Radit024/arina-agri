import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import FinancingAssumptionsDialog from '@/app/dashboard/keuangan/_components/FinancingAssumptionsDialog';
import type { UseFinancingControllerResult } from '@/controllers/keuangan/useFinancingController';

function makeFinancing(overrides: Partial<UseFinancingControllerResult> = {}): UseFinancingControllerResult {
  return {
    assumptions: null,
    loading: false,
    error: null,
    kebutuhanModalKerja: 22_159_000,
    bunga: null,
    arusKasPascaPembiayaan: [],
    kasAkhirPascaPembiayaan: null,
    dialogOpen: true,
    draft: {
      saldoKasAwal: '',
      modalSendiri: '',
      nilaiPinjaman: '',
      bungaPerPeriode: '',
      tanggalPencairan: '',
      tanggalPembayaran: '',
      biayaLain: '',
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

function renderDialog(financing = makeFinancing()) {
  return {
    financing,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <FinancingAssumptionsDialog financing={financing} />
      </ThemeProvider>,
    ),
  };
}

describe('FinancingAssumptionsDialog', () => {
  it('renders all financing input fields', () => {
    renderDialog();

    expect(screen.getByLabelText(/Saldo Kas Awal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Modal Sendiri/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nilai Pinjaman/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bunga per Periode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Pencairan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Pembayaran/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Biaya Lain/i)).toBeInTheDocument();
  });

  it('calls updateDraftField when a field changes', () => {
    const financing = makeFinancing();
    renderDialog(financing);

    fireEvent.change(screen.getByLabelText(/Nilai Pinjaman/i), { target: { value: '15000000' } });

    expect(financing.updateDraftField).toHaveBeenCalledWith('nilaiPinjaman', '15000000');
  });

  it('shows the saveError message when present', () => {
    renderDialog(makeFinancing({ saveError: 'Nilai pinjaman tidak boleh negatif' }));

    expect(screen.getByText('Nilai pinjaman tidak boleh negatif')).toBeInTheDocument();
  });

  it('calls submitDraft when the save button is clicked', () => {
    const financing = makeFinancing();
    renderDialog(financing);

    fireEvent.click(screen.getByRole('button', { name: /Simpan/i }));

    expect(financing.submitDraft).toHaveBeenCalled();
  });

  it('calls closeDialog when the cancel button is clicked', () => {
    const financing = makeFinancing();
    renderDialog(financing);

    fireEvent.click(screen.getByRole('button', { name: /Batal/i }));

    expect(financing.closeDialog).toHaveBeenCalled();
  });

  it('disables the save button when saving is true', () => {
    renderDialog(makeFinancing({ saving: true }));

    const saveButton = screen.getByRole('button', { name: /Simpan/i });
    expect(saveButton).toBeDisabled();
  });

  it('does not render when dialogOpen is false', () => {
    renderDialog(makeFinancing({ dialogOpen: false }));

    expect(screen.queryByLabelText(/Nilai Pinjaman/i)).not.toBeInTheDocument();
  });
});
