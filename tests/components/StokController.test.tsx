import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StokController from '@/controllers/stok/StokController';

vi.mock('next-intl', async () => {
  const messages = (await import('@/messages/id.json')).default as Record<string, unknown>;

  const readPath = (path: string): string => {
    const value = path.split('.').reduce<unknown>((node, key) => (
      node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined
    ), messages);
    return typeof value === 'string' ? value : path;
  };

  const format = (template: string, values?: Record<string, unknown>) => {
    if (!values) return template;
    return Object.entries(values).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
      template,
    );
  };

  return {
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => (
      format(readPath(namespace ? `${namespace}.${key}` : key), values)
    ),
  };
});

vi.mock('@/hooks/useWeatherRiskSignal', () => ({
  useWeatherRiskSignal: vi.fn(() => ({
    planningNote: '',
    riskNote: 'Peringatan BMKG: Hujan Lebat disertai Petir di Jawa Timur',
    warningMessage: '',
  })),
}));

vi.mock('@/hooks/useStok', () => ({
  computeExpiryDate: () => '2026-06-28',
  computeBatchPerformance: () => ({
    bepKg: null,
    sudahBalikModal: false,
    sisaBepKg: 0,
    sudahTerjual: 0,
  }),
  useStok: () => ({
    batches: [],
    mutations: [],
    summary: {
      totalStokSiapJual: 0,
      stokTerjualMingguIni: 0,
      estimasiNilaiStok: 0,
      batchHampirKadaluarsa: 0,
    },
    loading: false,
    backendOnline: true,
    buyers: [],
    grades: [{ id: 'grade-a', nama: 'A', urutan: 1 }],
    locations: [{ id: 'loc-main', nama: 'Gudang Utama', urutan: 1 }],
    addBatch: vi.fn(),
    closeBatch: vi.fn(),
    stockOut: vi.fn(),
    refreshMutations: vi.fn(),
    addGrade: vi.fn(),
    renameGrade: vi.fn(),
    removeGrade: vi.fn(),
    addLocation: vi.fn(),
    renameLocation: vi.fn(),
    removeLocation: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: () => ({ addTransaction: vi.fn() }),
}));

vi.mock('@/hooks/useSupplyItems', () => ({
  useSupplyItems: () => ({
    items: [],
    loading: false,
    addItem: vi.fn(),
    addMutation: vi.fn(),
  }),
}));

describe('StokController', () => {
  it('menampilkan subtitle stok yang operasional dan tidak menampilkan peringatan BMKG di header stok', () => {
    render(<StokController />);

    expect(screen.getByRole('heading', { name: 'Manajemen Stok' })).toBeInTheDocument();
    expect(screen.getByText('Kelola batch panen, stok keluar, bahan pendukung, dan lokasi penyimpanan.')).toBeInTheDocument();
    expect(screen.queryByText('Lokasi belum dipilih')).not.toBeInTheDocument();
    expect(screen.queryByText(/Peringatan BMKG/i)).not.toBeInTheDocument();
  });
});
