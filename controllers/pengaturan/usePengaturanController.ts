'use client';

import { useState, useEffect } from 'react';
import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';
import { profileApi } from '@/lib/api';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';
const WEATHER_TELEGRAM_CONTACT_KEY = 'arina-weather-telegram-contact';

export type SettingsTabId = 'general' | 'profil' | 'notifikasi' | 'info';

export function usePengaturanController() {
  const [activeTab, setActiveTab] = useState<SettingsTabId | null>(null);
  const { mode, setThemeMode } = useThemeMode();
  const { user } = useAuth();

  const userAvatar = user?.user_metadata?.avatar_url;

  // ─── WhatsApp phone ────────────────────────────────────────────────────────
  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const weatherTelegramKey = `${WEATHER_TELEGRAM_CONTACT_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [, setWeatherTelegramContact] = useLocalStorage<string>(weatherTelegramKey, '');
  const [profileWhatsappPhoneDraft, setProfileWhatsappPhoneDraft] = useState<string | null>(null);
  const profileWhatsappPhone = profileWhatsappPhoneDraft ?? weatherWhatsappPhone;

  // ─── Profile text fields ─────────────────────────────────────────────────
  const initialName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const [profileFullName, setProfileFullName] = useState<string>(initialName);
  const [profileLokasi, setProfileLokasi] = useState<string>(farmerProfile.lokasi);
  const [profileKomoditas, setProfileKomoditas] = useState<string>(farmerProfile.komoditas);
  const [profileLuasLahan, setProfileLuasLahan] = useState<string>(farmerProfile.luasLahan);

  // ─── Telegram username ─────────────────────────────────────────────────────
  const [profileTelegramContactDraft, setProfileTelegramContactDraft] = useState<string | null>(null);
  const [telegramContactSaved, setTelegramContactSaved] = useState<string>('');
  const profileTelegramUsername = profileTelegramContactDraft ?? telegramContactSaved;

  // ─── Shared save state ─────────────────────────────────────────────────────
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  // ─── Fetch existing profile on mount ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    profileApi
      .get()
      .then((profile) => {
        if (!active) return;

        if (profile.whatsappPhone) {
          setWeatherWhatsappPhone(profile.whatsappPhone);
        }
        if (profile.telegramContact) {
          setWeatherTelegramContact(profile.telegramContact);
          setTelegramContactSaved(profile.telegramContact);
        }
        if (profile.fullName) setProfileFullName(profile.fullName);
        if (profile.lokasi) setProfileLokasi(profile.lokasi);
        if (profile.komoditas) setProfileKomoditas(profile.komoditas);
        if (profile.luasLahan) setProfileLuasLahan(profile.luasLahan);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfileSaveError(error instanceof Error ? error.message : 'Gagal memuat profil');
      });

    return () => {
      active = false;
    };
  }, [user?.id, setWeatherTelegramContact, setWeatherWhatsappPhone]);

  const handleProfileWhatsappPhoneChange = (value: string) => {
    setProfileWhatsappPhoneDraft(value.replace(/\D/g, ''));
    setPhoneSaveSuccess(false);
    setProfileSaveError('');
  };

  const handleProfileTelegramUsernameChange = (value: string) => {
    setProfileTelegramContactDraft(value.trim());
    setPhoneSaveSuccess(false);
    setProfileSaveError('');
  };

  /**
   * Saves WhatsApp phone and Telegram username to:
   * 1. localStorage (for immediate weather notification compatibility)
   * 2. Supabase `profiles` table (for inbound webhook identity resolution)
   */
  const handleSaveProfile = async () => {
    const nextPhone = profileWhatsappPhone.trim();
    const nextTelegramContact = profileTelegramUsername.trim();

    setProfileSaving(true);
    setProfileSaveError('');
    try {
      const savedProfile = await profileApi.save({
        fullName: profileFullName,
        whatsappPhone: nextPhone,
        telegramContact: nextTelegramContact,
      });

      setWeatherWhatsappPhone(savedProfile.whatsappPhone);
      setWeatherTelegramContact(savedProfile.telegramContact);
      setProfileWhatsappPhoneDraft(null);
      setTelegramContactSaved(savedProfile.telegramContact);
      setProfileTelegramContactDraft(null);
      setPhoneSaveSuccess(true);
    } catch (error: unknown) {
      setPhoneSaveSuccess(false);
      setProfileSaveError(error instanceof Error ? error.message : 'Gagal menyimpan profil');
    } finally {
      setProfileSaving(false);
    }
  };

  return {
    activeTab,
    currentContentTab: activeTab || 'general',
    mode,
    phoneSaveSuccess,
    profileSaveError,
    profileSaving,
    profileWhatsappPhone,
    profileTelegramUsername,
    profileFullName,
    profileLokasi,
    profileKomoditas,
    profileLuasLahan,
    userAvatar,
    userInitials: profileFullName.substring(0, 2).toUpperCase(),
    onBackToMenu: () => setActiveTab(null),
    onProfileWhatsappPhoneChange: handleProfileWhatsappPhoneChange,
    onProfileTelegramUsernameChange: handleProfileTelegramUsernameChange,
    onProfileFullNameChange: (v: string) => { setProfileFullName(v); setPhoneSaveSuccess(false); setProfileSaveError(''); },
    onProfileLokasiChange: (v: string) => { setProfileLokasi(v); setPhoneSaveSuccess(false); setProfileSaveError(''); },
    onProfileKomoditasChange: (v: string) => { setProfileKomoditas(v); setPhoneSaveSuccess(false); setProfileSaveError(''); },
    onProfileLuasLahanChange: (v: string) => { setProfileLuasLahan(v); setPhoneSaveSuccess(false); setProfileSaveError(''); },
    onSaveProfile: handleSaveProfile,
    onTabChange: setActiveTab,
    onThemeModeChange: setThemeMode,
  };
}

