'use client';

import DashboardHomeView from '@/app/dashboard/_components/DashboardHomeView';
import { useDashboardHomeController } from './useDashboardHomeController';

export default function DashboardHomeController() {
  const controller = useDashboardHomeController();

  return <DashboardHomeView {...controller} />;
}
