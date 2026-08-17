import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import TransactionFormFields from '@/app/dashboard/keuangan/_components/TransactionFormFields';
import type { TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';

const theme = createTheme();

const draft: TransactionDraft = {
  id: 'transaction-form-fields-test',
  jenis: 'pengeluaran',
  kategori: 'Pupuk',
  volume: '10',
  satuan: 'karung',
  hargaSatuan: '20.000',
  nominal: '200.000',
  tanggal: '2026-06-19',
  keterangan: 'Urea',
  applyRabSuggestion: true,
};

describe('TransactionFormFields', () => {
  it('forwards nominal changes and supports the entry-only RAB suggestion action', () => {
    const onFieldChange = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <TransactionFormFields
          draft={draft}
          kategoriList={['Pupuk']}
          satuanList={['karung']}
          errors={{}}
          onFieldChange={onFieldChange}
          onOpenKategoriDialog={vi.fn()}
          onOpenSatuanDialog={vi.fn()}
          rabSuggestion="Saprodi - Pupuk Urea"
          showRabSuggestionAction
        />
      </ThemeProvider>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Nominal/i }), { target: { value: '350.000' } });

    expect(onFieldChange).toHaveBeenCalledWith('nominal', '350.000');

    const rabSuggestionCheckbox = screen.getByRole('checkbox', { name: /Hubungkan Otomatis/i });
    expect(rabSuggestionCheckbox).toBeChecked();

    fireEvent.click(rabSuggestionCheckbox);

    expect(onFieldChange).toHaveBeenCalledWith('applyRabSuggestion', 'false');
  });
});
