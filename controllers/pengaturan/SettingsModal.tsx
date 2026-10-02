'use client';

import SettingsModalView from '@/components/shared/SettingsModalView';
import { useSettingsModalController } from './useSettingsModalController';

export default function SettingsModal() {
  const controller = useSettingsModalController();

  return <SettingsModalView {...controller} />;
}