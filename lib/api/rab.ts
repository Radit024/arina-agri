// Akses data domain: rab.

import { supabase } from '@/lib/supabase';
import type {
  DbRabCategory,
  DbRabImport,
  DbRabItem,
} from '@/lib/supabase';
import type {
  ApiRabCategory,
  ApiRabItem,
  ApiRabImport,
} from './types';
import { resolveCurrentUser } from './client';
import { mapRabCategory, mapRabItem, mapRabImport } from './mappers';

export const rabApi = {
  getByProject: async (projectId: string): Promise<{ categories: ApiRabCategory[]; items: ApiRabItem[]; imports: ApiRabImport[] }> => {
    const user = await resolveCurrentUser();
    if (!user) return { categories: [], items: [], imports: [] };
    const [categoryResult, itemResult, importResult] = await Promise.all([
      supabase.from('rab_categories').select('*').eq('project_id', projectId).eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('rab_items').select('*').eq('project_id', projectId).eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('rab_imports').select('*').eq('project_id', projectId).eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (categoryResult.error) throw new Error(categoryResult.error.message);
    if (itemResult.error) throw new Error(itemResult.error.message);
    if (importResult.error) throw new Error(importResult.error.message);

    const categories = (categoryResult.data ?? []).map((row) => mapRabCategory(row as DbRabCategory));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const items = (itemResult.data ?? []).map((row) => {
      const item = row as DbRabItem;
      return mapRabItem(item, categoriesById.get(item.category_id));
    });
    const imports = (importResult.data ?? []).map((row) => mapRabImport(row as DbRabImport));
    return { categories, items, imports };
  },

  getByScenario: async (scenarioId: string): Promise<{ categories: ApiRabCategory[]; items: ApiRabItem[]; imports: ApiRabImport[] }> => {
    const user = await resolveCurrentUser();
    if (!user) return { categories: [], items: [], imports: [] };
    // We need project_id for imports — get it from categories
    const [categoryResult, itemResult] = await Promise.all([
      supabase.from('rab_categories').select('*').eq('scenario_id', scenarioId).eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('rab_items').select('*').eq('scenario_id', scenarioId).eq('user_id', user.id).order('sort_order', { ascending: true }),
    ]);
    if (categoryResult.error) throw new Error(categoryResult.error.message);
    if (itemResult.error) throw new Error(itemResult.error.message);

    const categories = (categoryResult.data ?? []).map((row) => mapRabCategory(row as DbRabCategory));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const items = (itemResult.data ?? []).map((row) => {
      const item = row as DbRabItem;
      return mapRabItem(item, categoriesById.get(item.category_id));
    });
    return { categories, items, imports: [] };
  },

  createCategoryForScenario: async (payload: Omit<ApiRabCategory, 'id'> & { scenarioId: string }): Promise<ApiRabCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_categories')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        scenario_id: payload.scenarioId,
        name: payload.name,
        type: payload.type,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRabCategory(data as DbRabCategory);
  },

  createItemForScenario: async (payload: Omit<ApiRabItem, 'id'> & { scenarioId: string }): Promise<ApiRabItem> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_items')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        scenario_id: payload.scenarioId,
        category_id: payload.categoryId,
        name: payload.name,
        type: payload.type,
        volume: payload.volume,
        unit: payload.unit,
        unit_price: payload.unitPrice,
        planned_total: payload.plannedTotal,
        planned_cash_month: payload.plannedCashMonth ?? null,
        aliases: payload.aliases,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ...mapRabItem(data as DbRabItem), categoryName: payload.categoryName };
  },

  createCategory: async (payload: Omit<ApiRabCategory, 'id'>): Promise<ApiRabCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_categories')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        name: payload.name,
        type: payload.type,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRabCategory(data as DbRabCategory);
  },

  updateCategory: async (id: string, payload: Partial<ApiRabCategory>): Promise<ApiRabCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.type !== undefined) update.type = payload.type;
    if (payload.sortOrder !== undefined) update.sort_order = payload.sortOrder;
    const { data, error } = await supabase.from('rab_categories').update(update).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw new Error(error.message);
    return mapRabCategory(data as DbRabCategory);
  },

  deleteCategory: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('rab_categories').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },

  createItem: async (payload: Omit<ApiRabItem, 'id'>): Promise<ApiRabItem> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_items')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        category_id: payload.categoryId,
        name: payload.name,
        type: payload.type,
        volume: payload.volume,
        unit: payload.unit,
        unit_price: payload.unitPrice,
        planned_total: payload.plannedTotal,
        planned_cash_month: payload.plannedCashMonth ?? null,
        aliases: payload.aliases,
        sort_order: payload.sortOrder,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // rab_items has no category_name column, so mapRabItem only fills it in when
    // given the joined category row (see getByProject). The caller already knows
    // the category name here (it just resolved/created the category), so use that
    // instead of leaving it undefined until the next full reload.
    return { ...mapRabItem(data as DbRabItem), categoryName: payload.categoryName };
  },

  updateItem: async (id: string, payload: Partial<ApiRabItem>): Promise<ApiRabItem> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.categoryId !== undefined) update.category_id = payload.categoryId;
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.type !== undefined) update.type = payload.type;
    if (payload.volume !== undefined) update.volume = payload.volume;
    if (payload.unit !== undefined) update.unit = payload.unit;
    if (payload.unitPrice !== undefined) update.unit_price = payload.unitPrice;
    if (payload.plannedTotal !== undefined) update.planned_total = payload.plannedTotal;
    if (payload.plannedCashMonth !== undefined) update.planned_cash_month = payload.plannedCashMonth ?? null;
    if (payload.aliases !== undefined) update.aliases = payload.aliases;
    if (payload.sortOrder !== undefined) update.sort_order = payload.sortOrder;

    const { data, error } = await supabase.from('rab_items').update(update).eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw new Error(error.message);
    // Same reasoning as createItem: rab_items has no category_name column, so use
    // whatever the caller already resolved instead of losing it until next reload.
    return { ...mapRabItem(data as DbRabItem), categoryName: payload.categoryName };
  },

  deleteItem: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('rab_items').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },

  recordImport: async (payload: Omit<ApiRabImport, 'id' | 'createdAt'>): Promise<ApiRabImport> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('rab_imports')
      .insert({
        user_id: user.id,
        project_id: payload.projectId,
        file_name: payload.fileName,
        status: payload.status,
        summary: payload.summary,
        errors: payload.errors,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRabImport(data as DbRabImport);
  },
};

// ─── Finance Scenario API ─────────────────────────────────────────