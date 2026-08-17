import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import TransactionFormFields, {
  type TransactionFormDraft,
} from '@/app/dashboard/keuangan/_components/TransactionFormFields';

const theme = createTheme();

const draft: TransactionFormDraft = {
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

  it('keeps form control IDs unique and forwards manager actions for each draft', () => {
    const firstKategoriDialog = vi.fn();
    const firstSatuanDialog = vi.fn();
    const secondKategoriDialog = vi.fn();
    const secondSatuanDialog = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <TransactionFormFields
          draft={{ ...draft, id: 'draft-1' }}
          idPrefix="draft-1"
          kategoriList={['Pupuk']}
          satuanList={['karung']}
          errors={{}}
          onFieldChange={vi.fn()}
          onOpenKategoriDialog={firstKategoriDialog}
          onOpenSatuanDialog={firstSatuanDialog}
          rabSuggestion={null}
        />
        <TransactionFormFields
          draft={{ ...draft, id: 'draft-2' }}
          idPrefix="draft-2"
          kategoriList={['Pupuk']}
          satuanList={['karung']}
          errors={{}}
          onFieldChange={vi.fn()}
          onOpenKategoriDialog={secondKategoriDialog}
          onOpenSatuanDialog={secondSatuanDialog}
          rabSuggestion={null}
        />
      </ThemeProvider>,
    );

    const controlIds = screen.getAllByRole('combobox').map((control) => control.id);
    expect(controlIds).toHaveLength(6);
    expect(new Set(controlIds).size).toBe(controlIds.length);

    fireEvent.click(screen.getAllByRole('button', { name: 'Kelola Kategori' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Kelola Satuan' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Kelola Kategori' })[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Kelola Satuan' })[1]);

    expect(firstKategoriDialog).toHaveBeenCalledTimes(1);
    expect(firstSatuanDialog).toHaveBeenCalledTimes(1);
    expect(secondKategoriDialog).toHaveBeenCalledTimes(1);
    expect(secondSatuanDialog).toHaveBeenCalledTimes(1);
  });
});
