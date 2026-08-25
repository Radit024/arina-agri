import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import TransactionDraftCard from '@/app/dashboard/keuangan/_components/TransactionDraftCard';
import type { TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';

const baseDraft: TransactionDraft = {
  id: 'draft-1',
  jenis: 'pengeluaran',
  kategori: 'Pupuk',
  volume: '',
  satuan: '',
  hargaSatuan: '',
  nominal: '850.000',
  tanggal: '10-08-2026',
  keterangan: 'Pembelian pupuk NPK 200 kg',
  applyRabSuggestion: false,
};

type CardProps = ComponentProps<typeof TransactionDraftCard>;

function renderCard(overrides: Partial<CardProps> = {}) {
  const props: CardProps = {
    draft: baseDraft,
    index: 0,
    isExpanded: false,
    hasError: false,
    errors: {},
    onExpand: vi.fn(),
    onRemove: vi.fn(),
    canRemove: true,
    kategoriList: ['Pupuk'],
    satuanList: [],
    onFieldChange: vi.fn(),
    onOpenKategoriDialog: vi.fn(),
    onOpenSatuanDialog: vi.fn(),
    rabSuggestion: null,
    ...overrides,
  };
  return render(<TransactionDraftCard {...props} />);
}

describe('TransactionDraftCard', () => {
  it('does not nest a button inside another button (hydration safety)', () => {
    const { container } = renderCard();

    expect(container.querySelector('button button')).toBeNull();
  });

  it('renders the remove button outside the accordion summary and wires onRemove', () => {
    const onRemove = vi.fn();
    const { getByRole } = renderCard({ onRemove });

    const removeButton = getByRole('button', { name: 'Hapus transaksi ini' });
    expect(removeButton.closest('.MuiAccordionSummary-root')).toBeNull();

    removeButton.click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
