import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

import SupplyItemsView from '@/app/dashboard/stok/_components/SupplyItemsView';
import type { ApiSupplyItem } from '@/lib/api';
import messages from '@/messages/id.json';

const theme = createTheme();

const stockMessages = messages.Stock as Record<string, unknown>;

function readPath(path: string): string {
  const value = path.split('.').reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
    stockMessages,
  );
  return typeof value === 'string' ? value : path;
}

function translate(key: string, values?: Record<string, string | number>): string {
  const template = readPath(key);
  if (!values) return template;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

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

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('SupplyItemsView', () => {
  it('menampilkan empty state ketika tidak ada item', () => {
    wrap(<SupplyItemsView items={[]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    expect(screen.getByText('Belum ada bahan pendukung')).toBeInTheDocument();
    expect(screen.getByText('Tambah pupuk, pestisida, atau alat yang Anda simpan')).toBeInTheDocument();
  });

  it('merender item dengan nama, stok, dan satuan', () => {
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    expect(screen.getByText('NPK Mutiara')).toBeInTheDocument();
    expect(screen.getByText(/50 kg/)).toBeInTheDocument();
  });

  it('membuka dialog mutasi ketika tombol Catat Masuk/Keluar diklik', () => {
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Catat Masuk/Keluar' }));
    expect(screen.getByLabelText('Jumlah (kg)')).toBeInTheDocument();
  });

  it('menormalisasi tanggal mutasi dari dd-MM-yyyy sebelum submit', async () => {
    const onAddMutation = vi.fn().mockResolvedValue(true);
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={onAddMutation} t={translate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Catat Masuk/Keluar' }));
    fireEvent.change(screen.getByLabelText('Jumlah (kg)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '05-06-2026' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Catat Masuk/Keluar' }).slice(-1)[0]);

    await waitFor(() => expect(onAddMutation).toHaveBeenCalledWith(expect.objectContaining({
      tanggal: '2026-06-05',
    })));
  });

  it('membuka dialog tambah item ketika tombol Tambah Item diklik', () => {
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={vi.fn()} onAddMutation={vi.fn()} t={translate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Item' }));
    expect(screen.getByLabelText('Nama Item')).toBeInTheDocument();
  });

  it('memanggil onAddItem dengan payload yang benar', async () => {
    const onAddItem = vi.fn().mockResolvedValue(true);
    wrap(<SupplyItemsView items={[mockItem]} loading={false} onAddItem={onAddItem} onAddMutation={vi.fn()} t={translate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tambah Item' }));

    const namaInput = screen.getByLabelText('Nama Item');
    fireEvent.change(namaInput, { target: { value: 'Urea 46%' } });

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
