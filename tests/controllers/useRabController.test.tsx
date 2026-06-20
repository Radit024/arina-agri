import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRabItems } from '@/hooks/useRabItems';
import { useRabController } from '@/controllers/keuangan/useRabController';
import type { ApiFinanceProject } from '@/lib/api';

vi.mock('@/hooks/useRabItems', () => ({
  useRabItems: vi.fn(),
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

const createCategory = vi.fn();
const createItem = vi.fn();

beforeEach(() => {
  createCategory.mockReset();
  createItem.mockReset();
  createCategory.mockResolvedValue({
    id: 'cat-saprodi',
    projectId: project.id,
    name: 'Saprodi',
    type: 'expense',
    sortOrder: 1,
  });
  createItem.mockResolvedValue(null);

  vi.mocked(useRabItems).mockReturnValue({
    categories: [],
    items: [],
    imports: [],
    loading: false,
    error: null,
    backendOnline: true,
    createCategory,
    createItem,
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    replaceRab: vi.fn(),
    reload: vi.fn(),
  });
});

describe('useRabController', () => {
  it('submits the complete RAB item draft with parsed aliases and planned total', async () => {
    const { result } = renderHook(() => useRabController(project));

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
});
