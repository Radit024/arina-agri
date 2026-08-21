import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppField } from '@/components/ui/AppField';
import { FieldWithManageAction } from '@/components/shared/forms/FieldWithManageAction';

describe('AppField', () => {
  it('renders a standard text field and fires onChange', () => {
    const handleChange = vi.fn();
    render(
      <AppField
        label="Nama Item"
        value="Benih Padi"
        onChange={handleChange}
        dataTestId="app-field-text"
      />
    );

    const input = screen.getByLabelText('Nama Item');
    expect(input).toHaveValue('Benih Padi');

    fireEvent.change(input, { target: { value: 'Benih Ciherang' } });
    expect(handleChange).toHaveBeenCalledWith('Benih Ciherang', expect.anything());
  });

  it('renders currency variant with Rp prefix and strips non-numeric input', () => {
    const handleChange = vi.fn();
    render(
      <AppField
        type="currency"
        label="Harga Satuan"
        value="150000"
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Rp')).toBeInTheDocument();
    const input = screen.getByLabelText('Harga Satuan');
    expect(input).toHaveValue('150000');

    fireEvent.change(input, { target: { value: 'Rp 200.000' } });
    expect(handleChange).toHaveBeenCalledWith('200000', expect.anything());
  });

  it('renders select variant with options', () => {
    const handleChange = vi.fn();
    render(
      <AppField
        type="select"
        label="Jenis Transaksi"
        value="expense"
        onChange={handleChange}
        options={[
          { label: 'Pengeluaran', value: 'expense' },
          { label: 'Pendapatan', value: 'income' },
        ]}
      />
    );

    expect(screen.getByLabelText('Jenis Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Pengeluaran')).toBeInTheDocument();
  });
});

describe('FieldWithManageAction', () => {
  it('renders children and manage icon button with accessible label', () => {
    const handleManage = vi.fn();
    render(
      <FieldWithManageAction
        onManage={handleManage}
        manageLabel="Kelola Kategori"
      >
        <AppField label="Kategori" value="Pupuk" />
      </FieldWithManageAction>
    );

    expect(screen.getByLabelText('Kategori')).toBeInTheDocument();
    const manageButton = screen.getByRole('button', { name: 'Kelola Kategori' });
    expect(manageButton).toBeInTheDocument();

    fireEvent.click(manageButton);
    expect(handleManage).toHaveBeenCalledTimes(1);
  });
});
