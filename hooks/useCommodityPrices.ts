'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface CommodityPrice {
  id: string;
  date: string;
  commodity: string;
  location: string;
  price: number;
  created_at: string;
}

export interface RegionPrice {
  name: string;
  price: number;
}

// ─── Realistic mock data for unauthenticated users ─────────────────
function generateMockPrices(): CommodityPrice[] {
  const today = new Date();
  const basePrice = 68200; // Disesuaikan dengan harga Siskaperbapo saat ini
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    // Gunakan fungsi matematis deterministik (bukan Math.random) agar angka tidak berubah-ubah saat di-refresh
    const pseudoRandom = (i * 13) % 100 / 100; // Menghasilkan angka 0.0 - 0.99 yang tetap untuk setiap indeks
    const variation = Math.sin(i / 3) * 3000 + (pseudoRandom - 0.4) * 2000;
    return {
      id: `mock-${i}`,
      date: d.toISOString().split('T')[0],
      commodity: 'Cabe Rawit Merah',
      location: 'Pasar Induk Malang',
      price: Math.round(Math.max(30000, basePrice + variation)),
      created_at: d.toISOString(),
    };
  });
}

const MOCK_PRICES = generateMockPrices();

export function useCommodityPrices(limit: number = 30) {
  const { user, loading: authLoading } = useAuth();
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user) {
        // Use mock data, sliced to requested limit
        setPrices(MOCK_PRICES.slice(-limit));
        setLoading(false);
        return;
      }
      const { data, error: sbError } = await supabase
        .from('commodity_prices')
        .select('*')
        .eq('commodity', 'Cabe Rawit Merah')
        .order('date', { ascending: true })
        .limit(limit);

      if (sbError) throw new Error(sbError.message);
      setPrices((data ?? []) as CommodityPrice[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data harga');
      // Fallback to mock on error
      setPrices(MOCK_PRICES.slice(-limit));
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived values ──────────────────────────────────────────────
  const todayPrice = prices.at(-1)?.price ?? null;
  const yesterdayPrice = prices.at(-2)?.price ?? null;
  const priceDelta = todayPrice !== null && yesterdayPrice !== null
    ? todayPrice - yesterdayPrice
    : null;
  const priceDeltaPct = yesterdayPrice && priceDelta !== null
    ? ((priceDelta / yesterdayPrice) * 100).toFixed(1)
    : null;
  const isTrendingUp = priceDelta !== null ? priceDelta >= 0 : null;

  // Mock region prices derived from today's price
  const regionPrices: RegionPrice[] = useMemo(() => {
    if (!todayPrice) return [];
    
    const regions = [
      'Pamekasan', 'Ngawi', 'Sidoarjo', 'Kediri', 'Banyuwangi',
      'Nganjuk', 'Madiun', 'Jember', 'Bojonegoro', 'Sumenep',
      'Tulungagung', 'Jombang', 'Probolinggo', 'Trenggalek', 'Magetan',
      'Gresik', 'Bondowoso', 'Pasuruan', 'Mojokerto', 'Surabaya',
      'Blitar', 'Ponorogo', 'Pacitan', 'Situbondo', 'Batu',
      'Sampang', 'Lamongan', 'Malang', 'Bangkalan', 'Tuban',
      'Lumajang'
    ];

    // Generate deterministic prices around today's average
    const data = regions.map((region, i) => {
      // Deterministic pseudo-random variation based on index
      const variation = (Math.sin(i * 1.5) * 8000) + (Math.cos(i * 3) * 4000);
      return {
        name: `Kab/Kota ${region}`,
        price: Math.max(30000, todayPrice + variation)
      };
    });

    // Sort descending by price like in the reference image
    return data.sort((a, b) => b.price - a.price);
  }, [todayPrice]);

  return {
    prices,
    regionPrices,
    loading,
    error,
    reload: loadData,
    todayPrice,
    yesterdayPrice,
    priceDelta,
    priceDeltaPct,
    isTrendingUp,
  };
}
