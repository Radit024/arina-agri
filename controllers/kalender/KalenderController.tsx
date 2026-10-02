'use client';

import KalenderView from '@/app/dashboard/kalender/_components/KalenderView';
import { useKalenderController } from './useKalenderController';

export default function KalenderController() {
  const controller = useKalenderController();

  return <KalenderView {...controller} />;
}
