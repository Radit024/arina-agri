'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ApiSupplyItem, ApiSupplyMutation, NewSupplyItem, NewSupplyMutation } from '@/lib/api';
import type { DbSupplyItem, DbSupplyMutation } from '@/lib/supabase';

function mapItem(db: DbSupplyItem): ApiSupplyItem {
  return {
    id: db.id,
    nama: db.nama,
    kategori: db.kategori,
    satuan: db.satuan,
    stokSaatIni: db.stok_saat_ini,
    hargaBeliTerakhir: db.harga_beli_terakhir,
    catatan: db.catatan ?? '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function mapMutation(db: DbSupplyMutation): ApiSupplyMutation {
  return {
    id: db.id,
    itemId: db.item_id,
    tipe: db.tipe,
    jumlah: db.jumlah,
    hargaSatuan: db.harga_satuan,
    tanggal: db.tanggal,
    keterangan: db.keterangan ?? '',
    linkedTransactionId: db.linked_transaction_id,
    createdAt: db.created_at,
  };
}

export function useSupplyItems() {
  const { user } = useAuth();

  const [items, setItems] = useState<ApiSupplyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('supply_items')
      .select('*')
      .eq('user_id', user.id)
      .order('nama', { ascending: true });
    if (err) { setError(err.message); } else { setItems((data ?? []).map(mapItem)); }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = useCallback(async (payload: NewSupplyItem): Promise<boolean> => {
    if (!user) return false;
    const { error: err } = await supabase.from('supply_items').insert({
      user_id: user.id,
      nama: payload.nama,
      kategori: payload.kategori,
      satuan: payload.satuan,
      harga_beli_terakhir: payload.hargaBeliTerakhir ?? null,
      catatan: payload.catatan ?? null,
    });
    if (err) { setError(err.message); return false; }
    await fetchItems();
    return true;
  }, [user, fetchItems]);

  const addMutation = useCallback(async (payload: NewSupplyMutation): Promise<boolean> => {
    if (!user) return false;

    const deltaStok = payload.tipe === 'masuk' ? payload.jumlah : -payload.jumlah;

    const { error: mutErr } = await supabase.from('supply_mutations').insert({
      user_id: user.id,
      item_id: payload.itemId,
      tipe: payload.tipe,
      jumlah: payload.jumlah,
      harga_satuan: payload.hargaSatuan ?? null,
      tanggal: payload.tanggal,
      keterangan: payload.keterangan ?? null,
    });
    if (mutErr) { setError(mutErr.message); return false; }

    const item = items.find((i) => i.id === payload.itemId);
    if (item) {
      const newStok = Math.max(item.stokSaatIni + deltaStok, 0);
      await supabase
        .from('supply_items')
        .update({ stok_saat_ini: newStok, updated_at: new Date().toISOString() })
        .eq('id', payload.itemId);
    }

    await fetchItems();
    return true;
  }, [user, items, fetchItems]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;
    const { error: err } = await supabase.from('supply_items').delete().eq('id', id);
    if (err) { setError(err.message); return false; }
    await fetchItems();
    return true;
  }, [user, fetchItems]);

  return { items, loading, error, addItem, addMutation, deleteItem, refetch: fetchItems };
}

export function useSupplyMutations(itemId: string | null) {
  const { user } = useAuth();

  const [mutations, setMutations] = useState<ApiSupplyMutation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !itemId) { setMutations([]); return; }
    setLoading(true);
    supabase
      .from('supply_mutations')
      .select('*')
      .eq('item_id', itemId)
      .eq('user_id', user.id)
      .order('tanggal', { ascending: false })
      .then(({ data }) => {
        setMutations((data ?? []).map(mapMutation));
        setLoading(false);
      });
  }, [user, itemId]);

  return { mutations, loading };
}
