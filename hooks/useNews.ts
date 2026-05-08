'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NewsArticle, UseNewsResult } from '@/lib/types/news';

// ─── Mock Data Fallback ───────────────────────────────────────────
// Ditampilkan saat Supabase belum terisi (sebelum cron pertama jalan)
const MOCK_NEWS: NewsArticle[] = [
  {
    id: 'mock-1',
    title: 'Harga Cabai Rawit di Pasar Induk Meningkat 15% Menjelang Akhir Bulan',
    snippet:
      'Harga cabai rawit merah di sejumlah pasar induk mengalami kenaikan signifikan akibat berkurangnya pasokan dari sentra produksi di Jawa Timur. Petani diminta mempersiapkan stok lebih awal.',
    link: '#',
    source: 'Antara News',
    image_url: null,
    pub_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: 'Pemerintah Salurkan Subsidi Pupuk untuk 2,5 Juta Petani di Jawa Timur',
    snippet:
      'Kementerian Pertanian mengumumkan penyaluran subsidi pupuk urea dan NPK untuk petani terdaftar. Petani dapat mengakses alokasi melalui kartu tani di kios resmi terdekat.',
    link: '#',
    source: 'Bisnis.com',
    image_url: null,
    pub_date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    title: 'BMKG Prakirakan Curah Hujan Tinggi di Wilayah Pertanian Jawa Tengah',
    snippet:
      'Badan Meteorologi memperingatkan petani untuk menunda penyemprotan pestisida dan memastikan drainase lahan dalam kondisi baik menghadapi musim hujan yang diperkirakan berlangsung hingga akhir bulan.',
    link: '#',
    source: 'BeritaJatim',
    image_url: null,
    pub_date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    title: 'Ekspor Komoditas Pertanian Indonesia Naik 12% di Kuartal Pertama 2026',
    snippet:
      'Nilai ekspor produk hortikultura dan komoditas pertanian unggulan Indonesia mencatat pertumbuhan positif, didorong oleh permintaan dari pasar Asia Tenggara dan Timur Tengah.',
    link: '#',
    source: 'Bisnis.com',
    image_url: null,
    pub_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    title: 'Teknik Irigasi Tetes Modern Bantu Petani Hemat Air hingga 40%',
    snippet:
      'Penerapan sistem irigasi tetes (drip irrigation) terbukti mengurangi konsumsi air secara signifikan sekaligus meningkatkan produktivitas tanaman cabai dan tomat di lahan kering.',
    link: '#',
    source: 'Antara News',
    image_url: null,
    pub_date: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-6',
    title: 'Hama Kutu Kebul Mulai Menyerang Pertanaman Cabai di Malang Raya',
    snippet:
      'Dinas Pertanian Kabupaten Malang mengeluarkan peringatan dini terkait serangan hama kutu kebul yang dapat menyebabkan virus gemini pada tanaman cabai. Petani disarankan melakukan monitoring rutin.',
    link: '#',
    source: 'BeritaJatim',
    image_url: null,
    pub_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

// ─── Hook ─────────────────────────────────────────────────────────
interface UseNewsOptions {
  limit?: number;
  page?: number;
}

export function useNews({ limit = 10, page = 1 }: UseNewsOptions = {}): UseNewsResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((n) => n + 1), []);

  useEffect(() => {
    let isMounted = true;

    async function fetchNews() {
      setIsLoading(true);
      setError(null);

      try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error: sbError, count } = await supabase
          .from('news_articles')
          .select('*', { count: 'exact' })
          .order('pub_date', { ascending: false })
          .range(from, to);

        if (!isMounted) return;

        if (sbError) {
          console.error('[useNews] Supabase error:', sbError.message);
          // Fallback ke mock data
          setArticles(MOCK_NEWS.slice(0, limit));
          setTotal(MOCK_NEWS.length);
          return;
        }

        const fetched = data as NewsArticle[];

        if (fetched.length === 0 && page === 1) {
          // Tabel masih kosong — gunakan mock data
          setArticles(MOCK_NEWS.slice(0, limit));
          setTotal(MOCK_NEWS.length);
        } else {
          setArticles(fetched);
          setTotal(count || 0);
        }
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Gagal memuat berita';
        setError(message);
        // Fallback ke mock data
        setArticles(MOCK_NEWS.slice(0, limit));
        setTotal(MOCK_NEWS.length);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchNews();

    return () => {
      isMounted = false;
    };
  }, [limit, page, trigger]);

  return { articles, total, isLoading, error, refetch };
}
