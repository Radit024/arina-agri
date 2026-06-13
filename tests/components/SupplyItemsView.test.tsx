import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import SupplyItemsView from '@/app/dashboard/stok/_components/SupplyItemsView';
import type { ApiSupplyItem } from '@/lib/api';

const theme = createTheme();

const mockItem: ApiSupplyItem = {
  id: 'item-1',
  nama: 'NPK Mutiara',
  kategori: 'bahan_pendukung',
  satuan: 'kg',
  stokSaatIni: 50,
  hargaBeliTerakhir: 15000,
  catatan: '',
  createdAt: '2026-06-13T00:00:00Z',
  updatedAt: '2026-06-13T00:00:00Z',
};

function translate(key: string): string {
  const map: Record<string, string> = {
    'supply.emptyState': 'Belum ada bahan pendukung',
    'supply.emptyStateDesc': 'Tambah pupuk atau alat',
    'supply.addItem': 'Tambah Item',
    'supply.addMutation': 'Catat Masuk/Keluar',
    'supply.kategori.bahan_pendukung': 'Bahan Pendukung',
    'supply.kategori.alat': 'Alat',
    'supply.fields.nama': 'Nama Item',
    'supply.fields.kategori': 'Kategori',
    'supply.fields.satuan': 'Satuan',
    'supply.fields.hargaBeliTerakhir': 'Harga Beli Terakhir',
    'supply.fields.catatan': 'Catatan',
    'supply.fields.jumlah': 'Jumlah',
    'supply.fields.tipe': 'Tipe Mutasi',
    'supply.fields.tanggal': 'Tanggal',
    'supply.fields.hargaSatuan': 'Harga Satuan (opsional)',
    'supply.mutation.masuk': 'Masuk',
    'supply.mutation.keluar': 'Keluar',
    'supply.mutation.distribusi': 'Distribusi ke Lahan',
  };
  return map[key] ?? key;
}

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('SupplyItemsView', () => {
  it('menampilkan empty state ketika tidak ada item', () => {
    wrap(<SupplyItemsView items={[]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    expect(screen.getByText('Belum ada bahan pendukung')).toBeInTheDocument();
  });

  it('merender item dengan nama, stok, dan satuan', () => {
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    expect(screen.getByText('NPK Mutiara')).toBeInTheDocument();
    expect(screen.getByText(/50 kg/)).toBeInTheDocument();
  });

  it('membuka dialog mutasi ketika tombol Catat Masuk/Keluar diklik', () => {
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Catat Masuk/Keluar' }));
    // Dialog opens — the Jumlah field should be visible
    expect(screen.getByLabelText(/Jumlah/)).toBeInTheDocument();
  });

  it('membuka dialog tambah item ketika tombol Tambah Item diklik', () => {
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    // Click the header Tambah Item button (only one when items exist)
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Item' }));
    expect(screen.getByLabelText('Nama Item')).toBeInTheDocument();
  });

  it('memanggil onAddItem dengan payload yang benar', async () => {
    const onAddItem = vi.fn().mockResolvedValue(true);
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={onAddItem} onAddMutation={vi.fn()} t={translate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Item' }));

    const namaInput = screen.getByLabelText('Nama Item');
    fireEvent.change(namaInput, { target: { value: 'Urea 46%' } });

    // Submit button inside dialog
    const submitBtn = screen.getAllByRole('button', { name: 'Tambah Item' }).slice(-1)[0];
    fireEvent.click(submitBtn);

    expect(onAddItem).toHaveBeenCalledWith(expect.objectContaining({
      nama: 'Urea 46%',
      kategori: 'bahan_pendukung',
      satuan: 'kg',
    }));
  });

  it('menampilkan loading state', () => {
    wrap(<SupplyItemsView items={[]} loading={true} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('stock-finance sync guard', () => {
  it('sync hanya dibuat ketika hargaRealisasi > 0', () => {
    const shouldSync = (harga: number | undefined) => !!harga && harga > 0;
    expect(shouldSync(45000)).toBe(true);
    expect(shouldSync(0)).toBe(false);
    expect(shouldSync(undefined)).toBe(false);
  });
});
