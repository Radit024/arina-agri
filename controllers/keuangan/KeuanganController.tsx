'use client';

import KeuanganView from '@/app/dashboard/keuangan/_components/KeuanganView';
import { useKeuanganController } from './useKeuanganController';

export default function KeuanganController() {
  const controller = useKeuanganController();

  return <KeuanganView {...controller} />;
}
