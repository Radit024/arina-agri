import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import StokController from '@/controllers/stok/StokController';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

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
    riskNote: 'Peringatan BMKG: Contoh peringatan uji',
    warningMessage: '',
  })),
}));

vi.mock('@/hooks/useStok', () => ({
  computeExpiryDate: () => '2026-06-28',
  computeBatchPerformance: () => ({
    bepKg: null,
    estimasiLabaJikaHabis: 0,
    sudahBalikModal: false,
    sisaBepKg: 0,
    sudahTerjual: 0,
    bepProgress: 0,
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
    addMutation: vi.fn(),
    openAddBatch: vi.fn(),
    openStockOut: vi.fn(),
    openManageLocations: vi.fn(),
    openManageBuyers: vi.fn(),
  }),
}));

describe('StokController', () => {
  it('menampilkan subtitle stok yang operasional dan tidak menampilkan peringatan BMKG di header stok', () => {
    render(<StokController />);

    expect(
      screen.getByText(/Kelola batch panen/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Peringatan BMKG/i)).not.toBeInTheDocument();
  });
});
