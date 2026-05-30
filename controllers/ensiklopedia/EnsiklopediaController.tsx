'use client';

import EnsiklopediaView from '@/app/dashboard/ensiklopedia/_components/EnsiklopediaView';
import { useEnsiklopediaController } from './useEnsiklopediaController';

export default function EnsiklopediaController() {
  const controller = useEnsiklopediaController();

  return <EnsiklopediaView {...controller} />;
}
