'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';
import { rabApi, type ApiRabCategory, type ApiRabImport, type ApiRabItem } from '@/lib/api';

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useRabItems(projectId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const storageKey = `arina-rab-${user?.id ?? 'guest'}-${projectId ?? 'none'}`;
  const [localState, setLocalState] = useLocalStorage<{
    categories: ApiRabCategory[];
    items: ApiRabItem[];
    imports: ApiRabImport[];
  }>(storageKey, { categories: [], items: [], imports: [] });
  const [categories, setCategories] = useState<ApiRabCategory[]>([]);
  const [items, setItems] = useState<ApiRabItem[]>([]);
  const [imports, setImports] = useState<ApiRabImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const syncLocalState = useCallback((next: typeof localState) => {
    setLocalState(next);
    setCategories(next.categories);
    setItems(next.items);
    setImports(next.imports);
  }, [setLocalState]);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!projectId) {
        setCategories([]);
        setItems([]);
        setImports([]);
        setError(null);
        return;
      }
      if (!user) {
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
  }, [authLoading, localState, projectId, syncLocalState, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createCategory = async (payload: Omit<ApiRabCategory, 'id'>) => {
    if (backendOnline && user) {
      const created = await rabApi.createCategory(payload);
      setCategories((prev) => [...prev, created]);
      return created;
    }
    const created: ApiRabCategory = { ...payload, id: createLocalId('rab-category') };
    syncLocalState({ ...localState, categories: [...localState.categories, created] });
    return created;
  };

  const updateCategory = async (id: string, payload: Partial<ApiRabCategory>) => {
    const applyCategoryUpdate = (category: ApiRabCategory) =>
      category.id === id ? { ...category, ...payload } : category;
    const applyItemCategoryName = (item: ApiRabItem, category: ApiRabCategory) =>
      item.categoryId === id ? { ...item, categoryName: category.name } : item;

    if (backendOnline && user) {
      const updated = await rabApi.updateCategory(id, payload);
      setCategories((prev) => prev.map((category) => (category.id === id ? updated : category)));
      setItems((prev) => prev.map((item) => applyItemCategoryName(item, updated)));
      return updated;
    }

    const nextCategories = localState.categories.map((category) => {
      const next = applyCategoryUpdate(category);
      return next;
    });
    const updatedCategory = nextCategories.find((category) => category.id === id) ?? null;
    const nextItems = updatedCategory
      ? localState.items.map((item) => applyItemCategoryName(item, updatedCategory))
      : localState.items;
    syncLocalState({ ...localState, categories: nextCategories, items: nextItems });
    return updatedCategory;
  };

  const deleteCategory = async (id: string) => {
    if (backendOnline && user) {
      await rabApi.deleteCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      return;
    }
    syncLocalState({
      ...localState,
      categories: localState.categories.filter((category) => category.id !== id),
    });
  };

  const createItem = async (payload: Omit<ApiRabItem, 'id'>) => {
    if (backendOnline && user) {
      const created = await rabApi.createItem(payload);
      setItems((prev) => [...prev, created]);
      return created;
    }
    const created: ApiRabItem = { ...payload, id: createLocalId('rab-item') };
    syncLocalState({ ...localState, items: [...localState.items, created] });
    return created;
  };

  const updateItem = async (id: string, payload: Partial<ApiRabItem>) => {
    if (backendOnline && user) {
      const updated = await rabApi.updateItem(id, payload);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    }
    let updatedItem: ApiRabItem | null = null;
    const nextItems = localState.items.map((item) => {
      if (item.id !== id) return item;
      updatedItem = { ...item, ...payload };
      return updatedItem;
    });
    syncLocalState({ ...localState, items: nextItems });
    return updatedItem;
  };

  const deleteItem = async (id: string) => {
    if (backendOnline && user) {
      await rabApi.deleteItem(id);
    }
    syncLocalState({ ...localState, items: localState.items.filter((item) => item.id !== id) });
  };

  const replaceRab = (next: { categories: ApiRabCategory[]; items: ApiRabItem[]; imports?: ApiRabImport[] }) => {
    syncLocalState({
      categories: next.categories,
      items: next.items,
      imports: next.imports ?? localState.imports,
    });
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
