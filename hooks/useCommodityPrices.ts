'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  buildLatestRegionAveragePriceKpi,
  buildLatestRegionPrices,
  buildProvincePriceTrend,
  calculateRegionAveragePrice,
  PROVINCE_PRICE_LOCATIONS,
  type CommodityPriceKpi,
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

const EMPTY_PRICE_KPI: CommodityPriceKpi = {
  todayPrice: null,
  yesterdayPrice: null,
  priceDelta: null,
  priceDeltaPct: null,
  isTrendingUp: null,
};

export function useCommodityPrices(limit: number = 30) {
  const { user, loading: authLoading } = useAuth();
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [dbRegionPrices, setDbRegionPrices] = useState<RegionPrice[]>([]);
  const [priceKpi, setPriceKpi] = useState<CommodityPriceKpi>(EMPTY_PRICE_KPI);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user) {
        setPrices([]);
        setDbRegionPrices([]);
        setPriceKpi(EMPTY_PRICE_KPI);
        return;
      }

      // 1. Fetch Trend for Jawa Timur (Provincial Average)
      const { data: trendDataRaw, error: sbError } = await supabase
        .from('commodity_prices')
        .select('*')
        .eq('commodity', 'Cabe Rawit Merah')
        .in('location', [...PROVINCE_PRICE_LOCATIONS])
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit * PROVINCE_PRICE_LOCATIONS.length);

      if (sbError) throw new Error(sbError.message);

      setPrices(buildProvincePriceTrend((trendDataRaw || []) as CommodityPrice[], limit));

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
        setPriceKpi(EMPTY_PRICE_KPI);
      } else {
        const mapRows = (mapData || []) as CommodityRegionPriceRow[];
        setDbRegionPrices(buildLatestRegionPrices(mapRows));
        setPriceKpi(buildLatestRegionAveragePriceKpi(mapRows));
      }
      
      setError(null);
    } catch (err) {
      console.error('Data load error:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data harga dari database');
      setPrices([]);
      setDbRegionPrices([]);
      setPriceKpi(EMPTY_PRICE_KPI);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Region prices (strictly from DB)
  const regionPrices: RegionPrice[] = useMemo(() => {
    return [...dbRegionPrices].sort((a, b) => b.price - a.price);
  }, [dbRegionPrices]);

  const averagePrice = useMemo(() => calculateRegionAveragePrice(regionPrices) ?? 0, [regionPrices]);

  return {
    prices,
    regionPrices,
    averagePrice,
    loading,
    error,
    reload: loadData,
    todayPrice: priceKpi.todayPrice,
    yesterdayPrice: priceKpi.yesterdayPrice,
    priceDelta: priceKpi.priceDelta,
    priceDeltaPct: priceKpi.priceDeltaPct,
    isTrendingUp: priceKpi.isTrendingUp,
  };
}
