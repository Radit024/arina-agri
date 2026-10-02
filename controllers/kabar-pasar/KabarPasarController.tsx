'use client';

import KabarPasarView from '@/app/dashboard/kabar-pasar/_components/KabarPasarView';
import { useKabarPasarController } from './useKabarPasarController';

export default function KabarPasarController() {
  const controller = useKabarPasarController();

  return <KabarPasarView {...controller} />;
}
