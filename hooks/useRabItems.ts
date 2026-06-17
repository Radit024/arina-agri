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

  const replaceRab = async (next: { categories: ApiRabCategory[]; items: ApiRabItem[]; imports?: ApiRabImport[] }) => {
    if (backendOnline && user) {
      await Promise.all(categories.map((category) => rabApi.deleteCategory(category.id)));

      const createdCategories = await Promise.all(
        next.categories.map((category) =>
          rabApi.createCategory({
            projectId: category.projectId,
            name: category.name,
            type: category.type,
            sortOrder: category.sortOrder,
          }),
        ),
      );
      const categoryByOriginalId = new Map(next.categories.map((category, index) => [category.id, createdCategories[index]]));
      const categoryByName = new Map(createdCategories.map((category) => [`${category.type}:${category.name}`, category]));
      const createdItems = await Promise.all(
        next.items.map((item) => {
          const category = categoryByOriginalId.get(item.categoryId)
            ?? categoryByName.get(`${item.type}:${item.categoryName ?? ''}`)
            ?? createdCategories.find((candidate) => candidate.type === item.type)
            ?? createdCategories[0];
          return rabApi.createItem({
            projectId: item.projectId,
            categoryId: category?.id ?? item.categoryId,
            categoryName: category?.name ?? item.categoryName,
            type: item.type,
            name: item.name,
            volume: item.volume,
            unit: item.unit,
            unitPrice: item.unitPrice,
            plannedTotal: item.plannedTotal,
            plannedCashMonth: item.plannedCashMonth,
            aliases: item.aliases,
            sortOrder: item.sortOrder,
          });
        }),
      );

      setCategories(createdCategories);
      setItems(createdItems);
      setImports(next.imports ?? imports);
      return;
    }

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
    createItem,
    updateItem,
    deleteItem,
    replaceRab,
    reload: loadData,
  };
}
