'use client';

import { useState } from 'react';
import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

export type SettingsTabId = 'general' | 'profil' | 'notifikasi' | 'info';

export function usePengaturanController() {
  const [activeTab, setActiveTab] = useState<SettingsTabId | null>(null);
  const { mode, setThemeMode } = useThemeMode();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const userAvatar = user?.user_metadata?.avatar_url;
  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [profileWhatsappPhoneDraft, setProfileWhatsappPhoneDraft] = useState<string | null>(null);
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);
  const profileWhatsappPhone = profileWhatsappPhoneDraft ?? weatherWhatsappPhone;

  const handleProfileWhatsappPhoneChange = (value: string) => {
    setProfileWhatsappPhoneDraft(value.replace(/\D/g, ''));
    setPhoneSaveSuccess(false);
  };

  const handleSaveProfile = () => {
    const nextPhone = profileWhatsappPhone.trim();
    setWeatherWhatsappPhone(nextPhone);
    setProfileWhatsappPhoneDraft(null);
    setPhoneSaveSuccess(true);
  };

  return {
    activeTab,
    currentContentTab: activeTab || 'general',
    farmerProfile,
    mode,
    phoneSaveSuccess,
    profileWhatsappPhone,
    userAvatar,
    userInitials: userName.substring(0, 2).toUpperCase(),
    userName,
    onBackToMenu: () => setActiveTab(null),
    onProfileWhatsappPhoneChange: handleProfileWhatsappPhoneChange,
    onSaveProfile: handleSaveProfile,
    onTabChange: setActiveTab,
    onThemeModeChange: setThemeMode,
  };
}
