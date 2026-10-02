'use client';

import StokView from '@/app/dashboard/stok/_components/StokView';
import { useStokController } from './useStokController';

export default function StokController() {
  const controller = useStokController();

  return <StokView {...controller} />;
}
