import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRabItemsForScenario } from '@/hooks/useRabItemsForScenario';
import { useRabController } from '@/controllers/keuangan/useRabController';
import type { ApiFinanceProject } from '@/lib/api';
import type { FinanceScenarioEntity } from '@/lib/finance/rabTypes';

vi.mock('@/hooks/useRabItemsForScenario', () => ({
  useRabItemsForScenario: vi.fn(),
}));

const project: ApiFinanceProject = {
  id: 'project-padi',
  name: 'Padi MT 1',
  commodity: 'Padi',
  landArea: 1,
  landAreaUnit: 'ha',
  seasonLabel: 'MT 1',
  startDate: '2026-01-01',
  endDate: '2026-04-30',
  status: 'active',
};

const scenario: FinanceScenarioEntity = {
  id: 'scenario-1',
  projectId: project.id,
  mode: 'PROJECTION',
};

const createCategory = vi.fn();
const updateCategory = vi.fn();
const deleteCategory = vi.fn();
const createItem = vi.fn();

beforeEach(() => {
  createCategory.mockReset();
  updateCategory.mockReset();
  deleteCategory.mockReset();
  createItem.mockReset();
  createCategory.mockResolvedValue({
    id: 'cat-saprodi',
    projectId: project.id,
    name: 'Saprodi',
    type: 'expense',
    sortOrder: 1,
  });
  createItem.mockResolvedValue(null);

  vi.mocked(useRabItemsForScenario).mockReturnValue({
    categories: [],
    items: [],
    imports: [],
    loading: false,
    error: null,
    backendOnline: true,
    createCategory,
    updateCategory,
    deleteCategory,
    createItem,
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    replaceRab: vi.fn(),
    reload: vi.fn(),
  });
});

describe('useRabController', () => {
  it('submits the complete RAB item draft with parsed aliases and planned total', async () => {
    const { result } = renderHook(() => useRabController(project, undefined, scenario));

    act(() => {
      result.current.updateRabItemDraftField('categoryName', 'Saprodi');
      result.current.updateRabItemDraftField('name', 'Pupuk Urea');
      result.current.updateRabItemDraftField('volume', '10');
      result.current.updateRabItemDraftField('unit', 'karung');
      result.current.updateRabItemDraftField('unitPrice', '20000');
      result.current.updateRabItemDraftField('plannedCashMonth', '2026-08');
      result.current.updateRabItemDraftField('aliases', 'urea, pupuk nitrogen');
    });

    await act(async () => {
      await result.current.submitRabItemDraft();
    });

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: project.id,
        categoryId: 'cat-saprodi',
        categoryName: 'Saprodi',
        type: 'expense',
        name: 'Pupuk Urea',
        volume: 10,
        unit: 'karung',
        unitPrice: 20000,
        plannedTotal: 200000,
        plannedCashMonth: '2026-08',
        aliases: ['urea', 'pupuk nitrogen'],
      }),
    );
  });

  it('provides selectable preset and custom RAB category options per type', () => {
    vi.mocked(useRabItemsForScenario).mockReturnValue({
      categories: [
        {
          id: 'cat-transport',
          projectId: project.id,
          name: 'Transport Panen',
          type: 'expense',
          sortOrder: 2,
        },
      ],
      items: [],
      imports: [],
      loading: false,
      error: null,
      backendOnline: true,
      createCategory,
      updateCategory,
      deleteCategory,
      createItem,
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      replaceRab: vi.fn(),
      reload: vi.fn(),
    });

    const { result } = renderHook(() => useRabController(project, undefined, scenario));

    expect(result.current.rabCategoryOptions).toEqual(
      expect.arrayContaining(['Saprodi', 'Tenaga Kerja', 'Transport Panen']),
    );

    act(() => {
      result.current.updateRabItemDraftField('type', 'income');
    });

    expect(result.current.rabItemDraft.categoryName).toBe('Penjualan Hasil Panen');
    expect(result.current.rabCategoryOptions).toEqual(
      expect.arrayContaining(['Penjualan Hasil Panen', 'Jasa', 'Lainnya']),
    );
    expect(result.current.rabCategoryOptions).not.toContain('Transport Panen');
  });

  it('adds a custom category for the current RAB type and selects it', async () => {
    createCategory.mockResolvedValue({
      id: 'cat-transport',
      projectId: project.id,
      name: 'Transport Panen',
      type: 'expense',
      sortOrder: 1,
    });

    const { result } = renderHook(() => useRabController(project, undefined, scenario));

    await act(async () => {
      await result.current.addRabCategory('Transport Panen');
    });

    expect(createCategory).toHaveBeenCalledWith({
      projectId: project.id,
      name: 'Transport Panen',
      type: 'expense',
      sortOrder: 1,
    });
    expect(result.current.rabItemDraft.categoryName).toBe('Transport Panen');
  });
});
