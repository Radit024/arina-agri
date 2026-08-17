import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppDialog from '@/components/ui/AppDialog';

vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => false,
}));

describe('AppDialog', () => {
  it('renders the optional leading visual', () => {
    render(
      <AppDialog
        leading={<span data-testid="dialog-leading">Panen</span>}
        open
        title="Tambah panen"
        onClose={vi.fn()}
      >
        Isi dialog
      </AppDialog>,
    );

    expect(screen.getByTestId('dialog-leading')).toBeInTheDocument();
  });

  it('invokes onClose from the named close button', () => {
    const onClose = vi.fn();

    render(
      <AppDialog open title="Tambah panen" onClose={onClose}>
        Isi dialog
      </AppDialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tutup dialog Tambah panen' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
