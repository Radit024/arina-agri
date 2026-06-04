'use client';

import { useState } from 'react';
import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

export type SettingsTabId = 'general' | 'profil' | 'notifikasi' | 'info';

export function usePengaturanController() {
  const [activeTab, setActiveTab] = useState<SettingsTabId | null>(null);
  const { mode, setThemeMode } = useThemeMode();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const userAvatar = user?.user_metadata?.avatar_url;

  // ─── WhatsApp phone ────────────────────────────────────────────────────────
  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [profileWhatsappPhoneDraft, setProfileWhatsappPhoneDraft] = useState<string | null>(null);
  const profileWhatsappPhone = profileWhatsappPhoneDraft ?? weatherWhatsappPhone;

  // ─── Telegram username ─────────────────────────────────────────────────────
  const [profileTelegramUsernameDraft, setProfileTelegramUsernameDraft] = useState<string | null>(null);
  const [telegramUsernameSaved, setTelegramUsernameSaved] = useState<string>('');
  const profileTelegramUsername = profileTelegramUsernameDraft ?? telegramUsernameSaved;

  // ─── Shared save state ─────────────────────────────────────────────────────
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const handleProfileWhatsappPhoneChange = (value: string) => {
    setProfileWhatsappPhoneDraft(value.replace(/\D/g, ''));
    setPhoneSaveSuccess(false);
  };

  const handleProfileTelegramUsernameChange = (value: string) => {
    // Strip leading "@" so storage is consistent regardless of what user types.
    setProfileTelegramUsernameDraft(value.replace(/^@+/, '').trim());
    setPhoneSaveSuccess(false);
  };

  /**
   * Saves WhatsApp phone and Telegram username to:
   * 1. localStorage (for immediate weather notification compatibility)
   * 2. Supabase `profiles` table (for inbound webhook identity resolution)
   */
  const handleSaveProfile = async () => {
    const nextPhone = profileWhatsappPhone.trim();
    const nextUsername = profileTelegramUsername.trim().replace(/^@+/, '');

    setProfileSaving(true);
    try {
      // Persist to localStorage for weather notification compatibility.
      setWeatherWhatsappPhone(nextPhone);

      // Persist to Supabase for inbound chat identity resolution (requires auth).
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({
            whatsapp_phone: nextPhone || null,
            telegram_username: nextUsername || null,
          })
          .eq('id', user.id);
      }

      setProfileWhatsappPhoneDraft(null);
      setTelegramUsernameSaved(nextUsername);
      setProfileTelegramUsernameDraft(null);
      setPhoneSaveSuccess(true);
    } finally {
      setProfileSaving(false);
    }
  };

  return {
    activeTab,
    currentContentTab: activeTab || 'general',
    farmerProfile,
    mode,
    phoneSaveSuccess,
    profileSaving,
    profileWhatsappPhone,
    profileTelegramUsername,
    userAvatar,
    userInitials: userName.substring(0, 2).toUpperCase(),
    userName,
    onBackToMenu: () => setActiveTab(null),
    onProfileWhatsappPhoneChange: handleProfileWhatsappPhoneChange,
    onProfileTelegramUsernameChange: handleProfileTelegramUsernameChange,
    onSaveProfile: handleSaveProfile,
    onTabChange: setActiveTab,
    onThemeModeChange: setThemeMode,
  };
}

