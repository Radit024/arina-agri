// Akses data domain: stok.

import { supabase } from '@/lib/supabase';
import { computeStockBatchStatus as computeStatus } from '@/lib/stok/computeStatus';
import type {
  ApiHarvestBatch,
  ApiStockMutation,
  StokSummary,
  ApiBuyer,
  ApiGrade,
  ApiLocation,
  DbBuyer,
  DbMasterDataRow,
  DbHarvestBatchUpdate,
} from './types';
import { resolveCurrentUser, authenticatedJsonRequest } from './client';
import { mapBatch, mapMutation } from './mappers';

export const stokApi = {
  getAll: async (): Promise<ApiHarvestBatch[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('harvest_batches')
      .select('*')
      .eq('user_id', user.id)
      .order('tanggal_panen', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBatch);
  },

  getSummary: async (): Promise<StokSummary> => {
    const user = await resolveCurrentUser();
    if (!user) {
      return {
        totalStokSiapJual: 0,
        stokTerjualMingguIni: 0,
        estimasiNilaiStok: 0,
        batchHampirKadaluarsa: 0,
      };
    }
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const fromDate = oneWeekAgo.toISOString().split('T')[0];

    const [batchResult, mutResult] = await Promise.all([
      supabase.from('harvest_batches').select('*').eq('user_id', user.id),
      supabase
        .from('stock_mutations')
        .select('berat')
        .eq('user_id', user.id)
        .eq('tipe', 'keluar')
        .gte('tanggal', fromDate),
    ]);

    if (batchResult.error) throw new Error(batchResult.error.message);
    if (mutResult.error) throw new Error(mutResult.error.message);

    const batches = (batchResult.data ?? []).map(mapBatch);
    const active = batches.filter(b => b.status !== 'habis');
    const stokTerjualMingguIni = (mutResult.data ?? []).reduce((sum, m) => sum + (m.berat ?? 0), 0);

    return {
      totalStokSiapJual: active.reduce((s, b) => s + b.stokTersisa, 0),
      stokTerjualMingguIni,
      estimasiNilaiStok: active.reduce((s, b) => s + b.stokTersisa * b.hargaJual, 0),
      batchHampirKadaluarsa: batches.filter(b => b.status === 'hampir_kadaluarsa').length,
    };
  },

  getMutations: async (params?: { grade?: string; from?: string; to?: string }): Promise<ApiStockMutation[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    let query = supabase
      .from('stock_mutations')
      .select('*, harvest_batches!inner(grade)')
      .eq('user_id', user.id)
      .order('tanggal', { ascending: false });
    if (params?.from) query = query.gte('tanggal', params.from);
    if (params?.to) query = query.lte('tanggal', params.to);
    if (params?.grade && params.grade !== 'semua') {
      query = query.eq('harvest_batches.grade', params.grade);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapMutation);
  },

  create: async (payload: Omit<ApiHarvestBatch, '_id' | 'batchCode' | 'stokTersisa' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ApiHarvestBatch> => {
    return authenticatedJsonRequest<ApiHarvestBatch>('/api/stok/batches', {
      method: 'POST',
      body: payload,
    });
  },

  update: async (id: string, payload: Partial<ApiHarvestBatch>): Promise<ApiHarvestBatch> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const update: DbHarvestBatchUpdate = {};
    if (payload.tanggalPanen !== undefined) update.tanggal_panen = payload.tanggalPanen;
    if (payload.grade !== undefined) update.grade = payload.grade;
    if (payload.beratMasuk !== undefined) update.berat_masuk = payload.beratMasuk;
    if (payload.stokTersisa !== undefined) update.stok_tersisa = payload.stokTersisa;
    if (payload.hargaModal !== undefined) update.harga_modal = payload.hargaModal;
    if (payload.hargaJual !== undefined) update.harga_jual = payload.hargaJual;
    if (payload.lokasiPenyimpanan !== undefined) update.lokasi_penyimpanan = payload.lokasiPenyimpanan;
    if (payload.estimasiKadaluarsa !== undefined) update.estimasi_kadaluarsa = payload.estimasiKadaluarsa;
    if (payload.catatan !== undefined) update.catatan = payload.catatan;
    if (payload.status !== undefined) update.status = payload.status;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('harvest_batches')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapBatch(data);
  },

  closeBatch: async (id: string): Promise<ApiHarvestBatch> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('harvest_batches')
      .update({ status: 'habis', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapBatch(data);
  },

  stockOut: async (batchId: string, payload: { berat: number; tujuan: string; tanggal: string; catatan: string; namaPembeli?: string; hargaRealisasi?: number }): Promise<{ batch: ApiHarvestBatch; mutation: ApiStockMutation }> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');

    const { data: batchRow, error: fetchErr } = await supabase
      .from('harvest_batches').select('*').eq('id', batchId).eq('user_id', user.id).single();
    if (fetchErr) throw new Error(fetchErr.message);
    const batch = mapBatch(batchRow);

    if (payload.berat > batch.stokTersisa) {
      throw new Error(`Stok tidak cukup. Tersisa: ${batch.stokTersisa} kg`);
    }

    const newStok = batch.stokTersisa - payload.berat;
    const newStatus = computeStatus(newStok, batch.beratMasuk, batch.estimasiKadaluarsa);

    const { data: updatedBatch, error: updateErr } = await supabase
      .from('harvest_batches')
      .update({ stok_tersisa: newStok, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', batchId)
      .eq('user_id', user.id)
      .select()
      .single();
    if (updateErr) throw new Error(updateErr.message);

    const { data: mutationRow, error: mutErr } = await supabase
      .from('stock_mutations')
      .insert({
        user_id: user.id,
        batch_id: batchId,
        batch_code: batch.batchCode,
        tipe: 'keluar',
        berat: payload.berat,
        tujuan: payload.tujuan,
        tanggal: payload.tanggal,
        catatan: payload.catatan,
        nama_pembeli: payload.namaPembeli ?? null,
        harga_realisasi: payload.hargaRealisasi ?? null,
      })
      .select()
      .single();
    if (mutErr) throw new Error(mutErr.message);

    return { batch: mapBatch(updatedBatch), mutation: mapMutation(mutationRow) };
  },
};


export const buyersApi = {
  getAll: async (): Promise<ApiBuyer[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('user_id', user.id)
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbBuyer) => ({
      id: row.id,
      nama: row.nama,
      userId: row.user_id,
      createdAt: row.created_at,
    }));
  },

  upsert: async (nama: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) return;
    const { error } = await supabase
      .from('buyers')
      .upsert({ user_id: user.id, nama }, { onConflict: 'user_id,nama', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },
};


export const gradesApi = {
  getAll: async (): Promise<ApiGrade[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('stock_grades')
      .select('*')
      .eq('user_id', user.id)
      .order('urutan', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbMasterDataRow) => ({ id: row.id, nama: row.nama, urutan: row.urutan ?? 0 }));
  },

  create: async (nama: string): Promise<ApiGrade> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('stock_grades')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  update: async (id: string, nama: string): Promise<ApiGrade> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('stock_grades')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data: gradeRow } = await supabase
      .from('stock_grades')
      .select('nama')
      .eq('id', id)
      .single();
    if (gradeRow) {
      const { count } = await supabase
        .from('harvest_batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('grade', gradeRow.nama)
        .neq('status', 'habis');
      if ((count ?? 0) > 0) {
        throw new Error(`Grade "${gradeRow.nama}" masih dipakai ${count} batch aktif. Tutup batch tersebut sebelum menghapus grade.`);
      }
    }
    const { error } = await supabase
      .from('stock_grades')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};


export const locationsApi = {
  getAll: async (): Promise<ApiLocation[]> => {
    const user = await resolveCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('user_id', user.id)
      .order('urutan', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: DbMasterDataRow) => ({ id: row.id, nama: row.nama, urutan: row.urutan ?? 0 }));
  },

  create: async (nama: string): Promise<ApiLocation> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('storage_locations')
      .insert({ user_id: user.id, nama })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  update: async (id: string, nama: string): Promise<ApiLocation> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await supabase
      .from('storage_locations')
      .update({ nama })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, nama: data.nama, urutan: data.urutan ?? 0 };
  },

  delete: async (id: string): Promise<void> => {
    const user = await resolveCurrentUser();
    if (!user) throw new Error('Belum login');
    const { data: locRow } = await supabase
      .from('storage_locations')
      .select('nama')
      .eq('id', id)
      .single();
    if (locRow) {
      const { count } = await supabase
        .from('harvest_batches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('lokasi_penyimpanan', locRow.nama)
        .neq('status', 'habis');
      if ((count ?? 0) > 0) {
        throw new Error(`Lokasi "${locRow.nama}" masih dipakai ${count} batch aktif. Tutup batch tersebut sebelum menghapus lokasi.`);
      }
    }
    const { error } = await supabase
      .from('storage_locations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};
