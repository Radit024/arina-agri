import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppDialog from '@/components/ui/AppDialog';

const useMediaQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@mui/material/useMediaQuery', () => ({
  default: useMediaQueryMock,
}));

describe('AppDialog', () => {
  beforeEach(() => {
    useMediaQueryMock.mockReturnValue(false);
  });

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

  it('honors an explicit fullScreen={false} on mobile', () => {
    useMediaQueryMock.mockReturnValue(true);

    render(
      <AppDialog fullScreen={false} open title="Tambah panen" onClose={vi.fn()}>
        Isi dialog
      </AppDialog>,
    );

    expect(screen.getByRole('dialog')).not.toHaveClass('MuiDialog-paperFullScreen');
  });

  it('honors an explicit fullScreen={true} over bottom-sheet presentation on mobile', () => {
    useMediaQueryMock.mockReturnValue(true);

    render(
      <AppDialog
        fullScreen
        mobilePresentation="bottom-sheet"
        open
        title="Tambah panen"
        onClose={vi.fn()}
      >
        Isi dialog
      </AppDialog>,
    );

    expect(screen.getByRole('dialog')).toHaveClass('MuiDialog-paperFullScreen');
  });
});
