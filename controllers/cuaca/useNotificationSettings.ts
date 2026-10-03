'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import type { User } from '@supabase/supabase-js';

import useLocalStorage from '@/hooks/useLocalStorage';
import { useCalendar } from '@/hooks/useCalendar';
import {
  eventApi,
  notificationApi,
  profileApi,
  type ApiCalendarEvent,
  type BmkgWarningsResponse,
} from '@/lib/api';
import {
  WEATHER_TELEGRAM_CONTACT_KEY,
  WEATHER_WHATSAPP_PHONE_KEY,
  scopedStorageKey,
} from '@/lib/storageKeys';

export interface CurrentWeatherSnapshot {
  suhu: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  kondisi: string;
  lokasi: string;
}

export interface UseNotificationSettingsOptions {
  user: User | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  locale: string;
  recipientName: string;
  displayedCurrentWeather: CurrentWeatherSnapshot;
  warningsData: BmkgWarningsResponse | null;
  todayDate: string;
  scheduleMessage?: string;
  getScheduleMessage?: () => string;
  events?: ApiCalendarEvent[];
}

export interface UseNotificationSettingsResult {
  notificationPlatform: 'whatsapp' | 'telegram';
  setNotificationPlatform: React.Dispatch<React.SetStateAction<'whatsapp' | 'telegram'>>;
  contactValue: string;
  setContactValue: React.Dispatch<React.SetStateAction<string>>;
  savedContact: string;
  setSavedContact: React.Dispatch<React.SetStateAction<string>>;
  storedWhatsapp: string;
  setStoredWhatsapp: React.Dispatch<React.SetStateAction<string>>;
  storedTelegram: string;
  setStoredTelegram: React.Dispatch<React.SetStateAction<string>>;
  contactSaving: boolean;
  contactSaveStatus: 'idle' | 'success' | 'error';
  contactSaveFeedback: string;
  notifAktif: boolean;
  setNotifAktif: React.Dispatch<React.SetStateAction<boolean>>;
  isSendingTest: boolean;
  testStatus: 'idle' | 'success' | 'error' | 'skipped';
  testFeedback: string;
  isCurrentContactSaved: boolean;
  contactLabel: string;
  contactPlaceholder: string;
  contactHelper: string;
  isWhatsappPlatform: boolean;
  handleContactValueChange: (value: string) => void;
  handlePlatformChange: (_event: MouseEvent<HTMLElement>, value: 'whatsapp' | 'telegram' | null) => void;
  handleSaveNotificationContact: () => Promise<void>;
  handleTestNotification: () => Promise<void>;
}

export function useNotificationSettings({
  user,
  t,
  locale,
  recipientName,
  displayedCurrentWeather,
  warningsData,
  todayDate,
  scheduleMessage,
  getScheduleMessage,
  events: optionsEvents,
}: UseNotificationSettingsOptions): UseNotificationSettingsResult {
  const weatherWhatsappKey = scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, user?.id);
  const weatherTelegramKey = scopedStorageKey(WEATHER_TELEGRAM_CONTACT_KEY, user?.id);
  const [storedWhatsapp, setStoredWhatsapp] = useLocalStorage<string>(weatherWhatsappKey, '');
  const [storedTelegram, setStoredTelegram] = useLocalStorage<string>(weatherTelegramKey, '');
  const [notificationPlatform, setNotificationPlatform] = useState<'whatsapp' | 'telegram'>('telegram');
  const contactStorageKey = notificationPlatform === 'whatsapp' ? weatherWhatsappKey : weatherTelegramKey;
  const [savedContact, setSavedContact] = useLocalStorage<string>(contactStorageKey, '');
  const [contactValue, setContactValue] = useState(savedContact);
  const [notifAktif, setNotifAktif] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error' | 'skipped'>('idle');
  const [testFeedback, setTestFeedback] = useState('');
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaveStatus, setContactSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contactSaveFeedback, setContactSaveFeedback] = useState('');
  const isCurrentContactSaved = contactValue.trim().length > 0 && contactValue.trim() === savedContact.trim();

  const { events: defaultEvents } = useCalendar();
  const calendarEventsSource = optionsEvents ?? defaultEvents;

  useEffect(() => {
    setContactValue(savedContact);
    setContactSaveStatus('idle');
    setContactSaveFeedback('');
  }, [savedContact]);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    profileApi
      .get()
      .then((profile) => {
        if (!active) return;

        if (profile.whatsappPhone) {
          setStoredWhatsapp(profile.whatsappPhone);
        }
        if (profile.telegramContact) {
          setStoredTelegram(profile.telegramContact);
        }

        const currentProfileContact = notificationPlatform === 'telegram'
          ? profile.telegramContact
          : profile.whatsappPhone;

        if (currentProfileContact) {
          setSavedContact(currentProfileContact);
          setContactValue(currentProfileContact);
        }
      })
      .catch(() => {
        // Local storage remains a fallback when profile sync is unavailable.
      });

    return () => {
      active = false;
    };
  }, [notificationPlatform, setSavedContact, setStoredTelegram, setStoredWhatsapp, user?.id]);

  const isWhatsappPlatform = notificationPlatform === 'whatsapp';
  const contactLabel = isWhatsappPlatform ? t('whatsapp.phoneLabel') : t('whatsapp.telegramLabel');
  const contactPlaceholder = isWhatsappPlatform ? t('whatsapp.phonePlaceholder') : t('whatsapp.telegramPlaceholder');
  const contactHelper = isWhatsappPlatform
    ? t('whatsapp.phoneHelper')
    : t('whatsapp.telegramHelper');

  const handleContactValueChange = (value: string) => {
    setContactValue(isWhatsappPlatform ? value.replace(/\D/g, '') : value);
    setContactSaveStatus('idle');
    setContactSaveFeedback('');
  };

  const handlePlatformChange = (_event: MouseEvent<HTMLElement>, value: 'whatsapp' | 'telegram' | null) => {
    if (value) {
      setNotificationPlatform(value);
      setContactSaveStatus('idle');
      setContactSaveFeedback('');
    }
  };

  const handleSaveNotificationContact = async () => {
    const nextContact = contactValue.trim();
    if (!nextContact) return;

    setContactSaving(true);
    setContactSaveStatus('idle');
    setContactSaveFeedback('');

    try {
      const savedProfile = await profileApi.save({
        fullName: recipientName,
        ...(isWhatsappPlatform
          ? { whatsappPhone: nextContact }
          : { telegramContact: nextContact }),
      });

      const savedValue = isWhatsappPlatform
        ? savedProfile.whatsappPhone
        : savedProfile.telegramContact;

      setSavedContact(savedValue);
      setContactValue(savedValue);
      if (isWhatsappPlatform) {
        setStoredWhatsapp(savedValue);
      } else {
        setStoredTelegram(savedValue);
      }
      setContactSaveStatus('success');
      setContactSaveFeedback(t('whatsapp.saved'));
    } catch (error: unknown) {
      setContactSaveStatus('error');
      setContactSaveFeedback(error instanceof Error ? error.message : 'Gagal menyimpan kontak notifikasi');
    } finally {
      setContactSaving(false);
    }
  };

  const handleTestNotification = async () => {
    const targetContact = (savedContact || contactValue).trim();

    if (!targetContact || !notifAktif) {
      setTestStatus('error');
      setTestFeedback(t('whatsapp.testNoContact', { platform: isWhatsappPlatform ? 'WhatsApp' : 'Telegram' }));
      return;
    }

    setIsSendingTest(true);
    setTestStatus('idle');
    setTestFeedback('');

    try {
      let calendarEvents = calendarEventsSource;
      try {
        const latestEvents = await eventApi.getAll();
        if (latestEvents.length) {
          calendarEvents = latestEvents;
        }
      } catch {
        calendarEvents = calendarEventsSource;
      }

      const todayEvents = calendarEvents
        .filter((event) => event.tanggal === todayDate)
        .map((event) => ({
          title: event.judul,
          time: event.waktu || undefined,
          category: event.jenis,
          note: event.catatan || undefined,
        }));

      const activeCustomMessage = getScheduleMessage
        ? getScheduleMessage()
        : (scheduleMessage?.trim() || undefined);

      const result = await notificationApi.decideAndSend({
        platform: notificationPlatform,
        to: isWhatsappPlatform ? targetContact.replace(/\D/g, '') : targetContact,
        recipientName,
        notificationsEnabled: notifAktif,
        weather: {
          kondisi: displayedCurrentWeather.kondisi,
          suhu: displayedCurrentWeather.suhu,
          kelembapan: displayedCurrentWeather.kelembapan,
          curahHujan: displayedCurrentWeather.curahHujan,
          kecepatanAngin: displayedCurrentWeather.kecepatanAngin,
          lokasi: displayedCurrentWeather.lokasi,
        },
        metadata: {
          source: 'weather-dashboard-test-button',
          customMessage: activeCustomMessage || undefined,
          dailyEvents: todayEvents,
          forceSend: true,
          locale: locale === 'en' ? 'en' : 'id',
          bmkgWarnings: warningsData?.warnings || [],
        },
      });

      if (result.sent) {
        setTestStatus('success');
        setTestFeedback(t('whatsapp.testSuccess', { level: result.decision.riskLevel, score: result.decision.riskScore }));
      } else {
        setTestStatus('skipped');
        setTestFeedback(t('whatsapp.testSkipped', { reason: result.decision.reason }));
      }
    } catch (error: unknown) {
      setTestStatus('error');
      setTestFeedback(error instanceof Error ? error.message : t('whatsapp.testError'));
    } finally {
      setIsSendingTest(false);
    }
  };

  return {
    notificationPlatform,
    setNotificationPlatform,
    contactValue,
    setContactValue,
    savedContact,
    setSavedContact,
    storedWhatsapp,
    setStoredWhatsapp,
    storedTelegram,
    setStoredTelegram,
    contactSaving,
    contactSaveStatus,
    contactSaveFeedback,
    notifAktif,
    setNotifAktif,
    isSendingTest,
    testStatus,
    testFeedback,
    isCurrentContactSaved,
    contactLabel,
    contactPlaceholder,
    contactHelper,
    isWhatsappPlatform,
    handleContactValueChange,
    handlePlatformChange,
    handleSaveNotificationContact,
    handleTestNotification,
  };
}
