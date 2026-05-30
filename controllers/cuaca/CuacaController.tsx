'use client';

import CuacaView from '@/app/dashboard/cuaca/_components/CuacaView';
import { useCuacaController } from './useCuacaController';

export default function CuacaController() {
  const controller = useCuacaController();

  return <CuacaView {...controller} />;
}
