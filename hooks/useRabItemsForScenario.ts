'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';
import { rabApi, type ApiRabCategory, type ApiRabImport, type ApiRabItem } from '@/lib/api';

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type RabLocalState = {
  categories: ApiRabCategory[];
  items: ApiRabItem[];
  imports: ApiRabImport[];
};

/**
 * Scenario-aware version of useRabItems.
 * Fetches rab_categories + rab_items WHERE scenario_id = scenarioId.
 * CRUD operations pass scenarioId on insert.
 * Shape identical to useRabItems so existing UI consumers need minimal changes.
 */
export function useRabItemsForScenario(scenarioId: string | null) {
  const { user, isGuestMode } = useAuth();
  const [categories, setCategories] = useState<ApiRabCategory[]>([]);
  const [items, setItems] = useState<ApiRabItem[]>([]);
  const [imports, setImports] = useState<ApiRabImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const storageKey = `arina-scenario-rab-${user?.id ?? 'guest'}-${scenarioId ?? 'none'}`;
  const [localState, setLocalState, isHydrated] = useSessionStorage<RabLocalState>(storageKey, { categories: [], items: [], imports: [] });

  const syncLocalState = useCallback((update: RabLocalState | ((prev: RabLocalState) => RabLocalState)) => {
    setLocalState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      setCategories(next.categories);
      setItems(next.items);
      setImports(next.imports);
      return next;
    });
  }, [setLocalState]);

  const localStateRef = useRef(localState);
  useEffect(() => {
    localStateRef.current = localState;
  }, [localState]);

  const loadData = useCallback(async () => {
    if (!isHydrated) return;
    setLoading(true);
    try {
      if (!scenarioId) {
        setCategories([]);
        setItems([]);
        setError(null);
        return;
      }
      if (!user || isGuestMode) {
        syncLocalState(localStateRef.current);
        setBackendOnline(false);
        setError(null);
        return;
      }
      const data = await rabApi.getByScenario(scenarioId);
      setCategories(data.categories);
      setItems(data.items);
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      syncLocalState(localStateRef.current);
      setBackendOnline(false);
      setError(err instanceof Error ? err.message : 'Gagal memuat RAB');
    } finally {
      setLoading(false);
    }
  }, [isGuestMode, isHydrated, scenarioId, syncLocalState, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createCategory = async (payload: Omit<ApiRabCategory, 'id'> & { scenarioId?: string }) => {
    const sid = payload.scenarioId ?? scenarioId ?? '';
    if (backendOnline && user && sid && !isGuestMode) {
      const created = await rabApi.createCategoryForScenario({ ...payload, scenarioId: sid });
      setCategories((prev) => [...prev, created]);
      return created;
    }
    const created: ApiRabCategory = { ...payload, id: createLocalId('rab-category') };
    syncLocalState((prev) => ({ ...prev, categories: [...prev.categories, created] }));
    return created;
  };

  const updateCategory = async (id: string, payload: Partial<ApiRabCategory>) => {
    const applyCategoryUpdate = (category: ApiRabCategory) =>
      category.id === id ? { ...category, ...payload } : category;
    const applyItemCategoryName = (item: ApiRabItem, category: ApiRabCategory) =>
      item.categoryId === id ? { ...item, categoryName: category.name } : item;

    if (backendOnline && user && !isGuestMode) {
      const updated = await rabApi.updateCategory(id, payload);
      setCategories((prev) => prev.map((category) => (category.id === id ? updated : category)));
      setItems((prev) => prev.map((item) => applyItemCategoryName(item, updated)));
      return updated;
    }

    let updatedCategory: ApiRabCategory | null = null;
    syncLocalState((prev) => {
      const nextCategories = prev.categories.map(applyCategoryUpdate);
      updatedCategory = nextCategories.find((category) => category.id === id) ?? null;
      const nextItems = updatedCategory
        ? prev.items.map((item) => applyItemCategoryName(item, updatedCategory as ApiRabCategory))
        : prev.items;
      return { ...prev, categories: nextCategories, items: nextItems };
    });
    return updatedCategory;
  };

  const deleteCategory = async (id: string) => {
    if (backendOnline && user && !isGuestMode) {
      await rabApi.deleteCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      return;
    }
    syncLocalState((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category.id !== id),
    }));
  };

  const createItem = async (payload: Omit<ApiRabItem, 'id'> & { scenarioId?: string }) => {
    const sid = payload.scenarioId ?? scenarioId ?? '';
    if (backendOnline && user && sid && !isGuestMode) {
      const created = await rabApi.createItemForScenario({ ...payload, scenarioId: sid });
      setItems((prev) => [...prev, created]);
      return created;
    }
    const created: ApiRabItem = { ...payload, id: createLocalId('rab-item') };
    syncLocalState((prev) => ({ ...prev, items: [...prev.items, created] }));
    return created;
  };

  const updateItem = async (id: string, payload: Partial<ApiRabItem>) => {
    if (backendOnline && user && !isGuestMode) {
      const updated = await rabApi.updateItem(id, payload);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    }
    let updatedItem: ApiRabItem | null = null;
    syncLocalState((prev) => {
      const nextItems = prev.items.map((item) => {
        if (item.id !== id) return item;
        updatedItem = { ...item, ...payload };
        return updatedItem;
      });
      return { ...prev, items: nextItems };
    });
    return updatedItem;
  };

  const deleteItem = async (id: string) => {
    if (backendOnline && user && !isGuestMode) {
      await rabApi.deleteItem(id);
    }
    syncLocalState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  };

  const replaceRab = (next: { categories: ApiRabCategory[]; items: ApiRabItem[]; imports?: ApiRabImport[] }) => {
    syncLocalState((prev) => ({
      categories: next.categories,
      items: next.items,
      imports: next.imports ?? prev.imports,
    }));
  };

  return {
    categories,
    items,
    imports,
    loading,
    error,
    backendOnline,
    createCategory,
    updateCategory,
    deleteCategory,
    createItem,
    updateItem,
    deleteItem,
    replaceRab,
    reload: loadData,
  };
}
