'use client';

import { useState, type ChangeEvent } from 'react';
import { useNews } from '@/hooks/useNews';

export const KABAR_PASAR_ITEMS_PER_PAGE = 16;

export const KABAR_PASAR_CATEGORIES = [
  { key: 'categories.all', value: '' },
  { key: 'categories.price', value: 'harga' },
  { key: 'categories.weather', value: 'cuaca' },
  { key: 'categories.policy', value: 'kebijakan' },
  { key: 'categories.farmingTips', value: 'tips' },
  { key: 'categories.market', value: 'pasar' },
];

export function useKabarPasarController() {
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('');

  const { articles, total, isLoading, error, refetch } = useNews({
    limit: KABAR_PASAR_ITEMS_PER_PAGE,
    page,
    category: activeCategory,
  });

  const totalPages = Math.ceil(total / KABAR_PASAR_ITEMS_PER_PAGE);

  const handlePageChange = (_: ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value);
    setPage(1);
  };

  return {
    activeCategory,
    articles,
    categories: KABAR_PASAR_CATEGORIES,
    error,
    isLoading,
    itemsPerPage: KABAR_PASAR_ITEMS_PER_PAGE,
    page,
    refetch,
    total,
    totalPages,
    handleCategoryChange,
    handlePageChange,
  };
}
