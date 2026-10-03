'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import {
  notificationScheduleApi,
  type NotificationScheduleConfig,
} from '@/lib/api';

export interface UseNotificationScheduleOptions {
  user: User | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  recipientName: string;
  activeAdm4?: string;
  activeLocationLabel?: string;
  displayedLocation: string;
  missingBmkgLocationMessage: string;
  storedWhatsapp: string;
  storedTelegram: string;
}

export interface UseNotificationScheduleResult {
  scheduleEnabled: boolean;
  setScheduleEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  scheduleTime: string;
  setScheduleTime: React.Dispatch<React.SetStateAction<string>>;
  scheduleTimezone: string;
  setScheduleTimezone: React.Dispatch<React.SetStateAction<string>>;
  schedulePlatform: 'whatsapp' | 'telegram';
  setSchedulePlatform: React.Dispatch<React.SetStateAction<'whatsapp' | 'telegram'>>;
  scheduleTo: string;
  setScheduleTo: React.Dispatch<React.SetStateAction<string>>;
  scheduleMessage: string;
  setScheduleMessage: React.Dispatch<React.SetStateAction<string>>;
  scheduleStatus: 'idle' | 'success' | 'error';
  setScheduleStatus: React.Dispatch<React.SetStateAction<'idle' | 'success' | 'error'>>;
  scheduleError: string;
  setScheduleError: React.Dispatch<React.SetStateAction<string>>;
  scheduleReady: boolean;
  dbSchedule: NotificationScheduleConfig | null;
  handleSaveSchedule: () => Promise<void>;
}

export function useNotificationSchedule({
  user,
  t,
  recipientName,
  activeAdm4,
  activeLocationLabel,
  displayedLocation,
  missingBmkgLocationMessage,
  storedWhatsapp,
  storedTelegram,
}: UseNotificationScheduleOptions): UseNotificationScheduleResult {
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('07:00');
  const [scheduleTimezone, setScheduleTimezone] = useState('Asia/Jakarta');
  const [schedulePlatform, setSchedulePlatform] = useState<'whatsapp' | 'telegram'>('telegram');
  const [scheduleTo, setScheduleTo] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState(t('whatsapp.defaultScheduleMessage'));
  const [scheduleStatus, setScheduleStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleReady, setScheduleReady] = useState(false);
  const [dbSchedule, setDbSchedule] = useState<NotificationScheduleConfig | null>(null);

  const scheduleContactFallback = schedulePlatform === 'telegram' ? storedTelegram : storedWhatsapp;

  useEffect(() => {
    notificationScheduleApi
      .get()
      .then((schedule) => {
        setScheduleEnabled(Boolean(schedule.enabled));
        setScheduleTime(schedule.time || '07:00');
        setScheduleTimezone(schedule.timezone || 'Asia/Jakarta');
        setSchedulePlatform(schedule.platform || 'whatsapp');
        const fallbackContact = schedule.platform === 'telegram' ? storedTelegram : storedWhatsapp;
        setScheduleTo(schedule.to || fallbackContact || '');
        if (schedule.customMessage) {
          setScheduleMessage(schedule.customMessage);
        }
        setDbSchedule(schedule);
        setScheduleReady(true);
      })
      .catch(() => {
        const fallback = storedWhatsapp || storedTelegram;
        if (fallback) setScheduleTo(fallback);
        setScheduleReady(true);
      });
  }, [storedWhatsapp, storedTelegram]);

  useEffect(() => {
    if (!scheduleReady) return;
    const fallback = scheduleContactFallback?.trim();
    if (fallback) {
      setScheduleTo(fallback);
    }
  }, [schedulePlatform, scheduleContactFallback, scheduleReady]);

  const handleSaveSchedule = async () => {
    const targetContact = scheduleContactFallback?.trim() || scheduleTo.trim();
    if (!targetContact) {
      setScheduleStatus('error');
      setScheduleError(t('whatsapp.scheduleNoContact'));
      return;
    }

    if (scheduleEnabled && !activeAdm4) {
      setScheduleStatus('error');
      setScheduleError(missingBmkgLocationMessage);
      return;
    }

    try {
      setScheduleStatus('idle');
      setScheduleError('');
      await notificationScheduleApi.set({
        enabled: scheduleEnabled,
        time: scheduleTime,
        timezone: scheduleTimezone,
        platform: schedulePlatform,
        to: targetContact,
        recipientName,
        customMessage: scheduleMessage.trim(),
        weatherAdm4: activeAdm4,
        weatherLocationLabel: activeLocationLabel || displayedLocation,
        userId: user?.id,
      });
      setScheduleStatus('success');
    } catch (error: unknown) {
      setScheduleStatus('error');
      setScheduleError(t('whatsapp.scheduleError', { error: error instanceof Error ? error.message : '' }));
    }
  };

  // Auto-sync weather location to database when resolved/changed
  useEffect(() => {
    if (!scheduleReady || !activeAdm4 || !user?.id) return;

    const needsSync = !dbSchedule ||
      dbSchedule.weatherAdm4 !== activeAdm4 ||
      dbSchedule.weatherLocationLabel !== activeLocationLabel;

    if (needsSync) {
      const targetContact = scheduleTo || scheduleContactFallback || '';

      const doSync = async () => {
        try {
          const res = await notificationScheduleApi.set({
            enabled: scheduleEnabled,
            time: scheduleTime,
            timezone: scheduleTimezone,
            platform: schedulePlatform,
            to: targetContact,
            recipientName,
            customMessage: scheduleMessage.trim(),
            weatherAdm4: activeAdm4,
            weatherLocationLabel: activeLocationLabel || displayedLocation,
            userId: user.id,
          });

          if (res && res.success) {
            setDbSchedule((prev) => ({
              enabled: prev?.enabled ?? scheduleEnabled,
              time: prev?.time ?? scheduleTime,
              timezone: prev?.timezone ?? scheduleTimezone,
              platform: prev?.platform ?? schedulePlatform,
              to: prev?.to ?? targetContact,
              recipientName: prev?.recipientName ?? recipientName,
              customMessage: prev?.customMessage ?? scheduleMessage.trim(),
              userId: prev?.userId ?? user.id,
              ...(prev ?? {}),
              weatherAdm4: activeAdm4,
              weatherLocationLabel: activeLocationLabel || displayedLocation,
            }));
          }
        } catch (err) {
          console.error('[useNotificationSchedule] Auto-sync location failed:', err);
        }
      };

      void doSync();
    }
  }, [
    scheduleReady,
    activeAdm4,
    activeLocationLabel,
    dbSchedule,
    user?.id,
    scheduleEnabled,
    scheduleTime,
    scheduleTimezone,
    schedulePlatform,
    scheduleTo,
    scheduleContactFallback,
    recipientName,
    scheduleMessage,
    displayedLocation,
  ]);

  return {
    scheduleEnabled,
    setScheduleEnabled,
    scheduleTime,
    setScheduleTime,
    scheduleTimezone,
    setScheduleTimezone,
    schedulePlatform,
    setSchedulePlatform,
    scheduleTo,
    setScheduleTo,
    scheduleMessage,
    setScheduleMessage,
    scheduleStatus,
    setScheduleStatus,
    scheduleError,
    setScheduleError,
    scheduleReady,
    dbSchedule,
    handleSaveSchedule,
  };
}
