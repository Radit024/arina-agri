'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  buildLatestRegionPrices,
  type CommodityRegionPriceRow,
  type RegionPrice,
} from '@/lib/commodityPriceRegions';

export interface CommodityPrice {
  id: string;
  date: string;
  commodity: string;
  location: string;
  price: number;
  created_at: string;
}

const PROVINCE_LOCATIONS = ['Jawa Timur', 'Propinsi Jawa Timur', 'Pasar Induk Malang'];

function preferProvincePrice(current: CommodityPrice | undefined, candidate: CommodityPrice) {
  if (!current) return candidate;
  const currentRank = PROVINCE_LOCATIONS.indexOf(current.location);
  const candidateRank = PROVINCE_LOCATIONS.indexOf(candidate.location);
  return candidateRank !== -1 && (currentRank === -1 || candidateRank < currentRank) ? candidate : current;
}

export function useCommodityPrices(limit: number = 30) {
  const { user, loading: authLoading } = useAuth();
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [dbRegionPrices, setDbRegionPrices] = useState<RegionPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user) {
        setPrices([]);
        setDbRegionPrices([]);
        return;
      }

      // 1. Fetch Trend for Jawa Timur (Provincial Average)
      const { data: trendDataRaw, error: sbError } = await supabase
        .from('commodity_prices')
        .select('*')
        .eq('commodity', 'Cabe Rawit Merah')
        .in('location', PROVINCE_LOCATIONS)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit * PROVINCE_LOCATIONS.length);

      if (sbError) throw new Error(sbError.message);

      const byDate = new Map<string, CommodityPrice>();
      (trendDataRaw || []).forEach((row) => {
        const price = row as CommodityPrice;
        byDate.set(price.date, preferProvincePrice(byDate.get(price.date), price));
      });

      const trendData = Array.from(byDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-limit);

      setPrices(trendData);

      // 2. Fetch map data from recent rows, then keep the latest available price per region.
      // Siskaperbapo can publish partial regional data on a given day, so using only one
      // global latest date leaves some map areas empty even when recent data exists.
      const { data: mapData, error: mapError } = await supabase
        .from('commodity_prices')
        .select('date,location,price,created_at')
        .eq('commodity', 'Cabe Rawit Merah')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit * 50);

      if (mapError) {
        console.error('Map data fetch error:', mapError.message);
        setDbRegionPrices([]);
      } else {
        setDbRegionPrices(buildLatestRegionPrices((mapData || []) as CommodityRegionPriceRow[]));
      }
      
      setError(null);
    } catch (err) {
      console.error('Data load error:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data harga dari database');
      setPrices([]);
      setDbRegionPrices([]);
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

  // Region prices (strictly from DB)
  const regionPrices: RegionPrice[] = useMemo(() => {
    return [...dbRegionPrices].sort((a, b) => b.price - a.price);
  }, [dbRegionPrices]);

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
