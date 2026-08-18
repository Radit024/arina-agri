import Button from '@mui/material/Button';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContentState from '@/components/ui/ContentState';

describe('ContentState', () => {
  it('renders children when content is ready', () => {
    render(<ContentState state="ready">Konten siap</ContentState>);

    expect(screen.getByText('Konten siap')).toBeInTheDocument();
  });

  it('renders an accessible loading state', () => {
    render(
      <ContentState state="loading" loadingLabel="Memuat catatan panen">
        Konten siap
      </ContentState>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Memuat catatan panen');
    expect(screen.queryByText('Konten siap')).not.toBeInTheDocument();
  });

  it('renders the empty state', () => {
    render(
      <ContentState state="empty" emptyMessage="Belum ada catatan panen.">
        Konten siap
      </ContentState>,
    );

    expect(screen.getByText('Belum ada catatan panen.')).toBeInTheDocument();
    expect(screen.queryByText('Konten siap')).not.toBeInTheDocument();
  });

  it('renders the empty state action', () => {
    const onAdd = vi.fn();

    render(
      <ContentState
        emptyAction={<Button onClick={onAdd}>Catat Transaksi</Button>}
        emptyMessage="Catat transaksi pertama untuk melihat arus kas."
        emptyTitle="Belum ada arus kas"
        state="empty"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Catat Transaksi' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('renders the error state and optional retry control', () => {
    render(
      <ContentState
        state="error"
        errorMessage="Catatan panen tidak dapat dimuat."
        retry={<button type="button">Coba lagi</button>}
      >
        Konten siap
      </ContentState>,
    );

    expect(screen.getByText('Catatan panen tidak dapat dimuat.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
    expect(screen.queryByText('Konten siap')).not.toBeInTheDocument();
  });
});
