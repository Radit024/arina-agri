import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRabItemsForScenario } from '@/hooks/useRabItemsForScenario';
import { rabApi } from '@/lib/api';
import type { ApiRabCategory, ApiRabItem } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  rabApi: {
    getByScenario: vi.fn(),
    createCategoryForScenario: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createItemForScenario: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const category: ApiRabCategory = {
  id: 'cat-1',
  projectId: 'project-1',
  name: 'Saprodi',
  type: 'expense',
  sortOrder: 1,
};

const item: ApiRabItem = {
  id: 'item-1',
  projectId: 'project-1',
  categoryId: 'cat-1',
  categoryName: 'Saprodi',
  type: 'expense',
  name: 'Pupuk Urea',
  volume: 10,
  unit: 'karung',
  unitPrice: 20000,
  plannedTotal: 200000,
  aliases: [],
  sortOrder: 1,
};

beforeEach(() => {
  vi.mocked(rabApi.getByScenario).mockReset();
  vi.mocked(rabApi.createCategoryForScenario).mockReset();
  vi.mocked(rabApi.updateCategory).mockReset();
  vi.mocked(rabApi.deleteCategory).mockReset();
  vi.mocked(rabApi.createItemForScenario).mockReset();
  vi.mocked(rabApi.updateItem).mockReset();
  vi.mocked(rabApi.deleteItem).mockReset();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
  window.sessionStorage.clear();
});

describe('useRabItemsForScenario', () => {
  it('fetches categories/items filtered by scenario_id', async () => {
    vi.mocked(rabApi.getByScenario).mockResolvedValue({
      categories: [category],
      items: [item],
      imports: [],
    });

    const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(rabApi.getByScenario).toHaveBeenCalledWith('scenario-1');
    expect(result.current.categories).toEqual([category]);
    expect(result.current.items).toEqual([item]);
    expect(result.current.backendOnline).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns empty lists and does not call the API when scenarioId is null', async () => {
    const { result } = renderHook(() => useRabItemsForScenario(null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(rabApi.getByScenario).not.toHaveBeenCalled();
    expect(result.current.categories).toEqual([]);
    expect(result.current.items).toEqual([]);
  });

  it('createCategory sends the scenario_id through to the API', async () => {
    vi.mocked(rabApi.getByScenario).mockResolvedValue({ categories: [], items: [], imports: [] });
    vi.mocked(rabApi.createCategoryForScenario).mockResolvedValue(category);

    const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createCategory({
        projectId: 'project-1',
        name: 'Saprodi',
        type: 'expense',
        sortOrder: 1,
      });
    });

    expect(rabApi.createCategoryForScenario).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: 'scenario-1', name: 'Saprodi' }),
    );
    expect(result.current.categories).toContainEqual(category);
  });

  it('createItem sends the scenario_id through to the API', async () => {
    vi.mocked(rabApi.getByScenario).mockResolvedValue({ categories: [], items: [], imports: [] });
    vi.mocked(rabApi.createItemForScenario).mockResolvedValue(item);

    const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createItem({
        projectId: 'project-1',
        categoryId: 'cat-1',
        categoryName: 'Saprodi',
        type: 'expense',
        name: 'Pupuk Urea',
        volume: 10,
        unit: 'karung',
        unitPrice: 20000,
        plannedTotal: 200000,
        aliases: [],
        sortOrder: 1,
      });
    });

    expect(rabApi.createItemForScenario).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: 'scenario-1', name: 'Pupuk Urea' }),
    );
    expect(result.current.items).toContainEqual(item);
  });

  it('updateItem and deleteItem call through to the API', async () => {
    vi.mocked(rabApi.getByScenario).mockResolvedValue({ categories: [], items: [item], imports: [] });
    const updatedItem = { ...item, name: 'Pupuk NPK' };
    vi.mocked(rabApi.updateItem).mockResolvedValue(updatedItem);
    vi.mocked(rabApi.deleteItem).mockResolvedValue(null);

    const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateItem('item-1', { name: 'Pupuk NPK' });
    });
    expect(rabApi.updateItem).toHaveBeenCalledWith('item-1', { name: 'Pupuk NPK' });
    expect(result.current.items).toContainEqual(updatedItem);

    await act(async () => {
      await result.current.deleteItem('item-1');
    });
    expect(rabApi.deleteItem).toHaveBeenCalledWith('item-1');
    expect(result.current.items).toEqual([]);
  });

  it('falls back to local state and sets error when the API call fails', async () => {
    vi.mocked(rabApi.getByScenario).mockRejectedValue(new Error('Gagal memuat RAB'));

    const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Gagal memuat RAB');
    expect(result.current.backendOnline).toBe(false);
  });

  describe('offline local-state fallback (no authenticated user)', () => {
    // The hook's create/update/delete methods branch on `backendOnline && user`.
    // With no user, `loadData` sets backendOnline=false and every CRUD op takes
    // the local-state (syncLocalState) path instead of calling the real API.
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
    });

    it('createCategory adds to local state with a generated id, without calling the API', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.backendOnline).toBe(false);

      let created: ApiRabCategory | undefined;
      await act(async () => {
        created = await result.current.createCategory({
          projectId: 'project-1',
          name: 'Saprodi',
          type: 'expense',
          sortOrder: 1,
        });
      });

      expect(rabApi.createCategoryForScenario).not.toHaveBeenCalled();
      expect(created?.id).toMatch(/^rab-category-/);
      expect(result.current.categories).toContainEqual(created);
    });

    it('createItem adds to local state with a generated id, without calling the API', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: ApiRabItem | undefined;
      await act(async () => {
        created = await result.current.createItem({
          projectId: 'project-1',
          categoryId: 'cat-1',
          categoryName: 'Saprodi',
          type: 'expense',
          name: 'Pupuk Urea',
          volume: 10,
          unit: 'karung',
          unitPrice: 20000,
          plannedTotal: 200000,
          aliases: [],
          sortOrder: 1,
        });
      });

      expect(rabApi.createItemForScenario).not.toHaveBeenCalled();
      expect(created?.id).toMatch(/^rab-item-/);
      // NOTE: the hook does NOT look up local category state to resolve categoryName
      // for offline-created items — it uses exactly whatever the caller passed in.
      expect(created?.categoryName).toBe('Saprodi');
      expect(result.current.items).toContainEqual(created);
    });

    it('updateCategory updates local state and cascades the rename to items in that category', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let createdCategory: ApiRabCategory | undefined;
      await act(async () => {
        createdCategory = await result.current.createCategory({
          projectId: 'project-1',
          name: 'Saprodi',
          type: 'expense',
          sortOrder: 1,
        });
      });
      await act(async () => {
        await result.current.createItem({
          projectId: 'project-1',
          categoryId: createdCategory!.id,
          categoryName: 'Saprodi',
          type: 'expense',
          name: 'Pupuk Urea',
          volume: 10,
          unit: 'karung',
          unitPrice: 20000,
          plannedTotal: 200000,
          aliases: [],
          sortOrder: 1,
        });
      });

      await act(async () => {
        await result.current.updateCategory(createdCategory!.id, { name: 'Saprodi Baru' });
      });

      expect(rabApi.updateCategory).not.toHaveBeenCalled();
      expect(result.current.categories.find((c) => c.id === createdCategory!.id)?.name).toBe('Saprodi Baru');
      // Cascade: items belonging to the renamed category get their categoryName updated too.
      expect(result.current.items.find((i) => i.categoryId === createdCategory!.id)?.categoryName).toBe(
        'Saprodi Baru',
      );
    });

    it('deleteCategory removes it from local state without calling the API', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let createdCategory: ApiRabCategory | undefined;
      await act(async () => {
        createdCategory = await result.current.createCategory({
          projectId: 'project-1',
          name: 'Saprodi',
          type: 'expense',
          sortOrder: 1,
        });
      });

      await act(async () => {
        await result.current.deleteCategory(createdCategory!.id);
      });

      expect(rabApi.deleteCategory).not.toHaveBeenCalled();
      expect(result.current.categories).toEqual([]);
    });

    it('deleteItem removes it from local state without calling the API', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let createdItem: ApiRabItem | undefined;
      await act(async () => {
        createdItem = await result.current.createItem({
          projectId: 'project-1',
          categoryId: 'cat-1',
          categoryName: 'Saprodi',
          type: 'expense',
          name: 'Pupuk Urea',
          volume: 10,
          unit: 'karung',
          unitPrice: 20000,
          plannedTotal: 200000,
          aliases: [],
          sortOrder: 1,
        });
      });

      await act(async () => {
        await result.current.deleteItem(createdItem!.id);
      });

      expect(rabApi.deleteItem).not.toHaveBeenCalled();
      expect(result.current.items).toEqual([]);
    });

    it('replaceRab resets categories and items in local state to whatever is passed in', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Seed local state with something different from what we'll replace it with.
      await act(async () => {
        await result.current.createCategory({
          projectId: 'project-1',
          name: 'Old Category',
          type: 'expense',
          sortOrder: 1,
        });
      });

      act(() => {
        result.current.replaceRab({ categories: [category], items: [item] });
      });

      expect(result.current.categories).toEqual([category]);
      expect(result.current.items).toEqual([item]);
    });

    // KNOWN BUG (not fixed by this test suite — flagged for the source, see report):
    // `imports` is declared as `const [imports] = useState<ApiRabImport[]>([])` with no
    // setter. `syncLocalState` (used by every offline CRUD op and by `replaceRab`) only
    // calls `setCategories`/`setItems`, never a setter for `imports`. So the `imports`
    // value returned by this hook is permanently `[]` and can never reflect what
    // `replaceRab({ imports })` was called with, even though `localState.imports`
    // internally does get updated. This test documents the actual (buggy) behavior.
    it('replaceRab updates the publicly returned imports list', async () => {
      const { result } = renderHook(() => useRabItemsForScenario('scenario-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const newImports = [
        {
          id: 'import-1',
          projectId: 'project-1',
          fileName: 'rab.xlsx',
          status: 'success' as const,
          summary: 'ok',
          errors: [],
          createdAt: '2026-06-01T00:00:00Z',
        },
      ];

      act(() => {
        result.current.replaceRab({ categories: [category], items: [item], imports: newImports });
      });

      expect(result.current.categories).toEqual([category]);
      expect(result.current.items).toEqual([item]);
      expect(result.current.imports).toEqual(newImports);
    });
  });
});
