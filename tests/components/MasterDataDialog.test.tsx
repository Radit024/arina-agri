import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MasterDataDialog, { type MasterDataDialogProps } from '@/components/shared/forms/MasterDataDialog';

function makeProps(overrides: Partial<MasterDataDialogProps> = {}): MasterDataDialogProps {
  return {
    open: true,
    onClose: vi.fn(),
    title: 'Kelola Grade',
    items: [{ id: 'grade-premium', nama: 'Grade Premium' }],
    onAdd: vi.fn(async () => undefined),
    onRename: vi.fn(async () => undefined),
    onDelete: vi.fn(async () => undefined),
    deleteError: null,
    onClearDeleteError: vi.fn(),
    ...overrides,
  };
}

describe('MasterDataDialog', () => {
  it('trims and saves an edited item when Enter is pressed', async () => {
    const onRename = vi.fn(async () => undefined);
    render(<MasterDataDialog {...makeProps({ onRename })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Grade Premium' }));
    const input = screen.getByDisplayValue('Grade Premium');
    fireEvent.change(input, { target: { value: '  Grade Utama  ' } });

    expect(screen.getByRole('button', { name: 'Simpan Grade Premium' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Batalkan edit Grade Premium' })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onRename).toHaveBeenCalledWith('grade-premium', 'Grade Utama');
    });
  });

  it('provides an accessible label for deleting each item', () => {
    render(<MasterDataDialog {...makeProps()} />);

    expect(screen.getByRole('button', { name: 'Hapus Grade Premium' })).toBeInTheDocument();
  });

  it('clears local values and delegates error clearing when closed', () => {
    const onClose = vi.fn();
    const onClearDeleteError = vi.fn();
    const props = makeProps({
      onClose,
      deleteError: 'Grade masih dipakai transaksi.',
      onClearDeleteError,
    });
    render(<MasterDataDialog {...props} />);

    fireEvent.change(screen.getByPlaceholderText('Nama baru...'), { target: { value: 'Grade Sementara' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tutup dialog Kelola Grade' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onClearDeleteError).toHaveBeenCalledOnce();
    expect(screen.getByPlaceholderText('Nama baru...')).toHaveValue('');
  });
});
