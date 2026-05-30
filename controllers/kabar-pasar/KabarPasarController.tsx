'use client';

import { useTranslations } from 'next-intl';
import KabarPasarView from '@/app/dashboard/kabar-pasar/_components/KabarPasarView';
import { useKabarPasarController } from './useKabarPasarController';

export default function KabarPasarController() {
  const t = useTranslations('KabarPasar');
  const controller = useKabarPasarController();

  return (
    <KabarPasarView
      activeCategory={controller.activeCategory}
      articles={controller.articles}
      categories={controller.categories}
      error={controller.error}
      isLoading={controller.isLoading}
      itemsPerPage={controller.itemsPerPage}
      page={controller.page}
      t={t}
      total={controller.total}
      totalPages={controller.totalPages}
      onCategoryChange={controller.handleCategoryChange}
      onPageChange={controller.handlePageChange}
      onRefetch={controller.refetch}
    />
  );
}
