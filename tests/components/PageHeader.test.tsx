import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PageActionButton, PageHeader, PageShell } from '@/components/shared/page';
import { pageActionButtonSx, pageShellSx } from '@/lib/ui/dashboardDesign';

describe('PageHeader', () => {
  it('renders an accessible Keuangan-style page heading, subtitle, and actions group', () => {
    render(
      <PageHeader
        title="Pencatatan Keuangan"
        subtitle="Pantau pemasukan dan pengeluaran panen."
        actions={(
          <>
            <Button startIcon={<AddIcon />}>Tambah transaksi</Button>
            <IconButton aria-label="Segarkan data">
              <RefreshIcon />
            </IconButton>
          </>
        )}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Pencatatan Keuangan', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Pantau pemasukan dan pengeluaran panen.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Aksi halaman Pencatatan Keuangan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah transaksi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Segarkan data' })).toBeInTheDocument();
  });

  it('can render an optional icon and metadata without adding controller logic', () => {
    render(
      <PageHeader
        title="Cuaca"
        subtitle="Pantau kondisi lahan hari ini."
        icon={<RefreshIcon data-testid="page-header-icon" />}
        meta={<span>BMKG</span>}
      />,
    );

    expect(screen.getByTestId('page-header-icon')).toBeInTheDocument();
    expect(screen.getByText('BMKG')).toBeInTheDocument();
  });
});

describe('PageShell', () => {
  it('keeps baseline layout styles while allowing caller sx to override later', () => {
    const overrideSx = { p: 4, minHeight: '320px' };
    const element = PageShell({
      sx: overrideSx,
      children: 'Konten halaman',
    }) as ReactElement<{ sx: unknown }>;

    expect(element.props.sx).toEqual([pageShellSx, overrideSx]);

    render(
      <PageShell data-testid="page-shell" sx={overrideSx}>
        Konten halaman
      </PageShell>,
    );

    const shell = screen.getByTestId('page-shell');
    expect(shell).toHaveTextContent('Konten halaman');
    expect(shell).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      padding: '32px',
      minHeight: '320px',
    });
  });
});

describe('PageActionButton', () => {
  it('preserves MUI Button props and lets caller sx override default action styles', () => {
    const handleClick = vi.fn();
    const overrideSx = { minHeight: 52, borderRadius: 4 };
    const element = PageActionButton({
      variant: 'contained',
      disabled: true,
      sx: overrideSx,
      children: 'Tambah data',
    }) as ReactElement<{ disabled: boolean; sx: unknown; variant: string }>;

    expect(element.props.variant).toBe('contained');
    expect(element.props.disabled).toBe(true);
    expect(element.props.sx).toEqual([pageActionButtonSx, overrideSx]);

    render(
      <PageActionButton
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleClick}
        sx={overrideSx}
      >
        Tambah data
      </PageActionButton>,
    );

    const action = screen.getByRole('button', { name: 'Tambah data' });
    fireEvent.click(action);

    expect(handleClick).toHaveBeenCalledOnce();
    expect(action).toHaveClass('MuiButton-contained');
  });
});
