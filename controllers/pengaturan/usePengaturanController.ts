'use client';

import { useState, useEffect } from 'react';
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

  // ─── Profile text fields ─────────────────────────────────────────────────
  const initialName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const [profileFullName, setProfileFullName] = useState<string>(initialName);
  const [profileLokasi, setProfileLokasi] = useState<string>(farmerProfile.lokasi);
  const [profileKomoditas, setProfileKomoditas] = useState<string>(farmerProfile.komoditas);
  const [profileLuasLahan, setProfileLuasLahan] = useState<string>(farmerProfile.luasLahan);

  // ─── Telegram username ─────────────────────────────────────────────────────
  const [profileTelegramUsernameDraft, setProfileTelegramUsernameDraft] = useState<string | null>(null);
  const [telegramUsernameSaved, setTelegramUsernameSaved] = useState<string>('');
  const profileTelegramUsername = profileTelegramUsernameDraft ?? telegramUsernameSaved;

  // ─── Shared save state ─────────────────────────────────────────────────────
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // ─── Fetch existing profile on mount ───────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('whatsapp_phone, telegram_username, full_name, lokasi, komoditas, luas_lahan')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            if (data.whatsapp_phone) {
              setWeatherWhatsappPhone(data.whatsapp_phone);
            }
            if (data.telegram_username) {
              setTelegramUsernameSaved(data.telegram_username);
            }
            if (data.full_name) setProfileFullName(data.full_name);
            if (data.lokasi) setProfileLokasi(data.lokasi);
            if (data.komoditas) setProfileKomoditas(data.komoditas);
            if (data.luas_lahan) setProfileLuasLahan(data.luas_lahan);
          }
        });
    }
  }, [user?.id, setWeatherWhatsappPhone]);

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
            full_name: profileFullName.trim() || null,
            lokasi: profileLokasi.trim() || null,
            komoditas: profileKomoditas.trim() || null,
            luas_lahan: profileLuasLahan.trim() || null,
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
    profileFullName,
    profileLokasi,
    profileKomoditas,
    profileLuasLahan,
    userAvatar,
    userInitials: profileFullName.substring(0, 2).toUpperCase(),
    userName: profileFullName,
    onBackToMenu: () => setActiveTab(null),
    onProfileWhatsappPhoneChange: handleProfileWhatsappPhoneChange,
    onProfileTelegramUsernameChange: handleProfileTelegramUsernameChange,
    onProfileFullNameChange: (v: string) => { setProfileFullName(v); setPhoneSaveSuccess(false); },
    onProfileLokasiChange: (v: string) => { setProfileLokasi(v); setPhoneSaveSuccess(false); },
    onProfileKomoditasChange: (v: string) => { setProfileKomoditas(v); setPhoneSaveSuccess(false); },
    onProfileLuasLahanChange: (v: string) => { setProfileLuasLahan(v); setPhoneSaveSuccess(false); },
    onSaveProfile: handleSaveProfile,
    onTabChange: setActiveTab,
    onThemeModeChange: setThemeMode,
  };
}

