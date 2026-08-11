'use client';

import { useCallback, useEffect, useState } from 'react';

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

export function useRabItems(projectId: string | null) {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const storageKey = `arina-rab-${user?.id ?? 'guest'}-${projectId ?? 'none'}`;
  const [localState, setLocalState, isHydrated] = useSessionStorage<RabLocalState>(
    storageKey,
    { categories: [], items: [], imports: [] },
  );
  const [categories, setCategories] = useState<ApiRabCategory[]>([]);
  const [items, setItems] = useState<ApiRabItem[]>([]);
  const [imports, setImports] = useState<ApiRabImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  // Accepts an updater function so consecutive calls (e.g. importing many items in a
  // loop) each build on the latest state instead of a stale closure snapshot.
  const syncLocalState = useCallback((update: RabLocalState | ((prev: RabLocalState) => RabLocalState)) => {
    setLocalState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      setCategories(next.categories);
      setItems(next.items);
      setImports(next.imports);
      return next;
    });
  }, [setLocalState]);

  const loadData = useCallback(async () => {
    if (authLoading || !isHydrated) return;
    setLoading(true);
    try {
      if (!projectId) {
        setCategories([]);
        setItems([]);
        setImports([]);
        setError(null);
        return;
      }
      if (!user || isGuestMode) {
        syncLocalState(localState);
        setBackendOnline(false);
        setError(null);
        return;
      }
      const data = await rabApi.getByProject(projectId);
      setCategories(data.categories);
      setItems(data.items);
      setImports(data.imports);
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      syncLocalState(localState);
      setBackendOnline(false);
      setError(err instanceof Error ? err.message : 'Gagal memuat RAB');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user, isGuestMode, authLoading, isHydrated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createCategory = async (payload: Omit<ApiRabCategory, 'id'>) => {
    if (backendOnline && user && !isGuestMode) {
      const created = await rabApi.createCategory(payload);
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

  const createItem = async (payload: Omit<ApiRabItem, 'id'>) => {
    if (backendOnline && user && !isGuestMode) {
      const created = await rabApi.createItem(payload);
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
