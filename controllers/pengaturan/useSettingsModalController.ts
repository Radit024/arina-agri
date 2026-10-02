'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Route } from 'next';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useTranslations, useLocale } from 'next-intl';

import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';
import { profileApi } from '@/lib/api';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';
const WEATHER_TELEGRAM_CONTACT_KEY = 'arina-weather-telegram-contact';

export type LanguageMode = 'id' | 'en';

type AuthIdentity = {
  provider?: string;
};

type UserWithIdentities = {
  identities?: AuthIdentity[];
};

/**
 * Modal Pengaturan dibuka lewat query string (`?settings=true&tab=profil`)
 * supaya bisa dipanggil dari mana saja tanpa menyimpan state di layout.
 * Semua state form, pemuatan profil, dan pergantian tema/bahasa hidup di sini;
 * `SettingsModalView` hanya menerima hasilnya.
 */
export function useSettingsModalController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() as Route;
  const t = useTranslations('Settings');
  const locale = useLocale();

  const isOpen = searchParams.get('settings') === 'true';
  const initialTab = searchParams.get('tab') || 'general';

  const { user } = useAuth();
  const { mode, setThemeMode } = useThemeMode();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = user?.user_metadata?.avatar_url;
  const isGoogleUser =
    user?.app_metadata?.provider === 'google' ||
    (user as UserWithIdentities | null)?.identities?.some((id) => id.provider === 'google');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [languageMode, setLanguageMode] = useState<LanguageMode>(locale as LanguageMode);

  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const weatherTelegramKey = `${WEATHER_TELEGRAM_CONTACT_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [, setWeatherTelegramContact] = useLocalStorage<string>(weatherTelegramKey, '');

  const [profileWhatsappPhone, setProfileWhatsappPhone] = useState(weatherWhatsappPhone);
  const [telegramId, setTelegramId] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(searchParams.get('tab') || 'general');
    }
  }, [isOpen, searchParams]);

  useEffect(() => {
    setProfileWhatsappPhone(weatherWhatsappPhone);
  }, [weatherWhatsappPhone]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let active = true;

    profileApi
      .get()
      .then((profile) => {
        if (!active) return;

        setProfileWhatsappPhone(profile.whatsappPhone || weatherWhatsappPhone);
        setTelegramId(profile.telegramContact);
        if (profile.whatsappPhone) setWeatherWhatsappPhone(profile.whatsappPhone);
        if (profile.telegramContact) setWeatherTelegramContact(profile.telegramContact);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfileSaveError(error instanceof Error ? error.message : 'Gagal memuat profil');
      });

    return () => {
      active = false;
    };
  }, [isOpen, user?.id, weatherWhatsappPhone, setWeatherTelegramContact, setWeatherWhatsappPhone]);

  const handleClose = () => {
    router.push(pathname, { scroll: false });
  };

  const handleAppearanceChange = (_: MouseEvent<HTMLElement>, nextMode: 'light' | 'dark' | null) => {
    if (nextMode) {
      setThemeMode(nextMode);
    }
  };

  const handleLanguageChange = (event: SelectChangeEvent<LanguageMode>) => {
    const nextLocale = event.target.value as LanguageMode;
    setLanguageMode(nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSaveError('');
    setProfileSaveSuccess(false);

    try {
      const savedProfile = await profileApi.save({
        fullName: userName,
        whatsappPhone: profileWhatsappPhone,
        telegramContact: telegramId,
      });

      setProfileWhatsappPhone(savedProfile.whatsappPhone);
      setTelegramId(savedProfile.telegramContact);
      setWeatherWhatsappPhone(savedProfile.whatsappPhone);
      setWeatherTelegramContact(savedProfile.telegramContact);
      setProfileSaveSuccess(true);
    } catch (error: unknown) {
      setProfileSaveError(error instanceof Error ? error.message : 'Gagal menyimpan profil');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTelegramChange = (value: string) => {
    setTelegramId(value);
    setProfileSaveSuccess(false);
    setProfileSaveError('');
  };

  return {
    activeTab,
    handleAppearanceChange,
    handleClose,
    handleLanguageChange,
    handleSaveProfile,
    handleTelegramChange,
    isGoogleUser,
    isOpen,
    languageMode,
    mode,
    profileSaveError,
    profileSaveSuccess,
    profileSaving,
    setActiveTab,
    t,
    telegramId,
    userAvatar,
    userInitials,
    userName,
  };
}

export type SettingsModalControllerResult = ReturnType<typeof useSettingsModalController>;