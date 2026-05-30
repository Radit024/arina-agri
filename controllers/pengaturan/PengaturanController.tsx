'use client';

import PengaturanView from '@/app/dashboard/pengaturan/_components/PengaturanView';
import { usePengaturanController } from './usePengaturanController';

export default function PengaturanController() {
  const controller = usePengaturanController();

  return <PengaturanView {...controller} />;
}
