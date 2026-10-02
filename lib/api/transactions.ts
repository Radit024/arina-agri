// Akses data domain: transactions.

import { supabase } from '@/lib/supabase';
import type {
  DbTransactionCategory,
  DbTransactionSatuan,
} from '@/lib/supabase';
import type {
  ApiTransaction,
  ApiTransactionCategory,
  DbTransactionUpdate,
} from './types';
import { resolveCurrentUser, authenticatedJsonRequest } from './client';
import { mapTx } from './mappers';

export const transactionApi = {
  getAll: async (): Promise<ApiTransaction[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTx);
  },

  getByScenario: async (scenarioId: string): Promise<ApiTransaction[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('scenario_id', scenarioId)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTx);
  },

  createForScenario: async (
    payload: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'> & { scenarioId: string },
  ): Promise<ApiTransaction> => {
    return authenticatedJsonRequest<ApiTransaction>('/api/finance/transactions', {
      method: 'POST',
      body: { ...payload, scenario_id: payload.scenarioId },
    });
  },

  create: async (payload: Omit<ApiTransaction, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiTransaction> => {
    return authenticatedJsonRequest<ApiTransaction>('/api/finance/transactions', {
      method: 'POST',
      body: payload,
    });
  },

  update: async (id: string, payload: Partial<ApiTransaction>): Promise<ApiTransaction> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: DbTransactionUpdate = {};
    if (payload.jenis !== undefined) update.jenis = payload.jenis;
    if (payload.kategori !== undefined) update.kategori = payload.kategori;
    if (payload.nominal !== undefined) update.nominal = payload.nominal;
    if (payload.tanggal !== undefined) update.tanggal = payload.tanggal;
    if (payload.keterangan !== undefined) update.keterangan = payload.keterangan;
    if (payload.projectId !== undefined) update.project_id = payload.projectId;
    if (payload.rabCategoryId !== undefined) update.rab_category_id = payload.rabCategoryId;
    if (payload.rabItemId !== undefined) update.rab_item_id = payload.rabItemId;
    if (payload.volume !== undefined) update.volume = payload.volume;
    if (payload.satuan !== undefined) update.satuan = payload.satuan;
    if (payload.hargaSatuan !== undefined) update.harga_satuan = payload.hargaSatuan;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapTx(data);
  },

  delete: async (id: string): Promise<null> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return null;
  },
};

// ─── Calendar Events API ──────────────────────────────────────────

export const transactionCategoryApi = {
  getAll: async (): Promise<ApiTransactionCategory[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbTransactionCategory) => ({ id: row.id, nama: row.nama }));
  },

  create: async (nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionCategory;
    return { id: row.id, nama: row.nama };
  },

  update: async (id: string, nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionCategory;
    return { id: row.id, nama: row.nama };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase
      .from('finance_transaction_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};

// ─── Transaction Satuan API ───────────────────────────────────────

export const transactionSatuanApi = {
  getAll: async (): Promise<ApiTransactionCategory[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbTransactionSatuan) => ({ id: row.id, nama: row.nama }));
  },

  create: async (nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionSatuan;
    return { id: row.id, nama: row.nama };
  },

  update: async (id: string, nama: string): Promise<ApiTransactionCategory> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('finance_transaction_satuans')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const row = data as DbTransactionSatuan;
    return { id: row.id, nama: row.nama };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { error } = await supabase
      .from('finance_transaction_satuans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};

// ─── Migration API (Tahap 2 Roadmap) ──────────────────────────────