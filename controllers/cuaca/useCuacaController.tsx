'use client';

import { useTheme } from '@mui/material/styles';
import { useEffect,useState,type MouseEvent } from 'react';

import useLocalStorage from '@/hooks/useLocalStorage';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import {
eventApi,
locationApi,
notificationApi,
notificationScheduleApi,
weatherApi,
type BmkgForecastResponse,
type BmkgWarningsResponse,
} from '@/lib/api';
import { useLocale,useTranslations } from 'next-intl';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';
const WEATHER_TELEGRAM_CONTACT_KEY = 'arina-weather-telegram-contact';

type GpsRequestMode = 'auto' | 'manual';

import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/hooks/useCalendar';

export function useCuacaController() {

  const theme = useTheme();
  const t = useTranslations('Weather');
  const locale = useLocale();
  const { user } = useAuth();
  const { events } = useCalendar();
  const todayDate = new Intl.DateTimeFormat('en-CA').format(new Date());

  const {
    gpsLocation,
    setGpsLocation,
    gpsAutoAttempted,
    setGpsAutoAttempted,
    activeAdm4,
    activeLocationLabel,
  } = useWeatherLocation();

  const weatherWhatsappKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const weatherTelegramKey = `${WEATHER_TELEGRAM_CONTACT_KEY}-${user?.id || 'guest'}`;
  const [storedWhatsapp] = useLocalStorage<string>(weatherWhatsappKey, '');
  const [storedTelegram] = useLocalStorage<string>(weatherTelegramKey, '');
  const [notificationPlatform, setNotificationPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const contactStorageKey = notificationPlatform === 'whatsapp' ? weatherWhatsappKey : weatherTelegramKey;
  const [savedContact, setSavedContact] = useLocalStorage<string>(contactStorageKey, '');
  const [contactValue, setContactValue] = useState(savedContact);
  const [notifAktif, setNotifAktif] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error' | 'skipped'>('idle');
  const [testFeedback, setTestFeedback] = useState('');
  const isCurrentContactSaved = contactValue.trim().length > 0 && contactValue.trim() === savedContact.trim();

  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('07:00');
  const [scheduleTimezone, setScheduleTimezone] = useState('Asia/Jakarta');
  const [schedulePlatform, setSchedulePlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [scheduleTo, setScheduleTo] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState(t('whatsapp.defaultScheduleMessage'));
  const [scheduleStatus, setScheduleStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleReady, setScheduleReady] = useState(false);

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState('');
  const [forecastData, setForecastData] = useState<BmkgForecastResponse | null>(null);
  const [warningsData, setWarningsData] = useState<BmkgWarningsResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const scheduleContactFallback = schedulePlatform === 'telegram' ? storedTelegram : storedWhatsapp;

  const missingBmkgLocationMessage = t('errors.missingBmkgLocation');
  const loadBmkgErrorMessage = t('errors.loadBmkg');

  useEffect(() => {
    setContactValue(savedContact);
  }, [savedContact]);

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

  useEffect(() => {
    let active = true;

    async function loadBmkgWeather() {
      try {
        setWeatherLoading(true);
        setWeatherError('');
        
        const warnings = await weatherApi.getWarnings();
        if (!active) return;
        setWarningsData(warnings);

        const currentAdm4 = activeAdm4;
        const currentLabel = activeLocationLabel;

        if (!currentAdm4) {
          setForecastData(null);
          if (currentLabel) {
            setWeatherError(missingBmkgLocationMessage);
          }
          return;
        }

        const forecast = await weatherApi.getForecast({ adm4: currentAdm4, locationLabel: currentLabel });
        if (!active) return;
        setForecastData(forecast);
      } catch (error) {
        if (!active) return;
        setWeatherError(error instanceof Error ? error.message : loadBmkgErrorMessage);
      } finally {
        if (active) setWeatherLoading(false);
      }
    }

    void loadBmkgWeather();
    const intervalId = window.setInterval(() => {
      void loadBmkgWeather();
    }, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [activeAdm4, activeLocationLabel, loadBmkgErrorMessage, missingBmkgLocationMessage]);

  const fForecast = forecastData
    ? forecastData.days.map((day) => ({
        tanggal: day.date,
        suhuMin: day.minTemperatureC,
        suhuMax: day.maxTemperatureC,
        kondisi: day.dominantCondition,
        curahHujan: day.totalRainfallMm,
      }))
    : [];
  const fAlerts = warningsData?.warnings.length
    ? warningsData.warnings.map((warning) => ({
        id: warning.id,
        tanggal: (warning.effective || warning.expires || new Date().toISOString()).slice(0, 10),
        jenisPeringatan: warning.event,
        pesan: warning.headline || warning.description,
        status: 'terkirim' as const,
      }))
    : [];

  const fallbackLocation = activeLocationLabel || t('location.unknown');

  const fCurrent = forecastData
    ? {
        suhu: forecastData.current.temperatureC,
        kelembapan: forecastData.current.humidityPercent,
        curahHujan: forecastData.current.rainfallMm,
        kecepatanAngin: forecastData.current.windSpeedKmh,
        kondisi: forecastData.current.condition,
        lokasi: forecastData.current.locationLabel || fallbackLocation,
      }
    : {
        suhu: 0,
        kelembapan: 0,
        curahHujan: 0,
        kecepatanAngin: 0,
        kondisi: 'cerah',
        lokasi: fallbackLocation,
      };

  // Keep current card in sync with the forecast tile marked as "Today".
  const todayForecast = fForecast.find((day) => day.tanggal === todayDate);
  const displayedCurrentWeather = forecastData
    ? fCurrent
    : todayForecast
    ? {
        ...fCurrent,
        suhu: todayForecast.suhuMax,
        kondisi: todayForecast.kondisi,
        curahHujan: todayForecast.curahHujan,
      }
    : fCurrent;

  const dayNames = [t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat')];
  const currentCondition = displayedCurrentWeather.kondisi.toLowerCase();
  const isRainy = currentCondition === 'hujan' || currentCondition === 'gerimis';
  const isSunny = currentCondition === 'cerah';
  const isCloudy = currentCondition === 'berawan' || currentCondition === 'mendung';

  const currentWeatherCardBackground =
    currentCondition === 'cerah'
      ? 'linear-gradient(135deg, var(--weather-sunny-start) 0%, var(--weather-sunny-mid) 45%, var(--weather-sunny-end) 100%)'
      : currentCondition === 'berawan' || currentCondition === 'mendung'
        ? 'linear-gradient(135deg, var(--weather-cloudy-start) 0%, var(--weather-cloudy-mid) 55%, var(--weather-cloudy-end) 100%)'
        : 'linear-gradient(135deg, var(--weather-rainy-start) 0%, var(--weather-rainy-mid) 60%, var(--weather-rainy-end) 100%)';
  const forecastSectionBackground = '#fff';
  const getForecastDayBackground = (condition: string) => {
    const normalized = condition.toLowerCase();
    if (normalized === 'cerah') {
      return 'linear-gradient(135deg, rgba(251,191,36,0.92) 0%, rgba(245,158,11,0.94) 100%)';
    }
    if (normalized === 'berawan' || normalized === 'mendung') {
      return 'linear-gradient(135deg, rgba(148,163,184,0.9) 0%, rgba(71,85,105,0.92) 100%)';
    }
    if (normalized === 'hujan' || normalized === 'gerimis') {
      return 'linear-gradient(135deg, rgba(56,189,248,0.88) 0%, rgba(29,78,216,0.94) 100%)';
    }
    return 'linear-gradient(135deg, rgba(34,197,94,0.86) 0%, rgba(22,163,74,0.92) 100%)';
  };

  const recipientName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('farmerFallback');
  const isWhatsappPlatform = notificationPlatform === 'whatsapp';
  const contactLabel = isWhatsappPlatform ? t('whatsapp.phoneLabel') : t('whatsapp.telegramLabel');
  const contactPlaceholder = isWhatsappPlatform ? t('whatsapp.phonePlaceholder') : t('whatsapp.telegramPlaceholder');
  const contactHelper = isWhatsappPlatform
    ? t('whatsapp.phoneHelper')
    : t('whatsapp.telegramHelper');

  const getConditionLabel = (condition: string) => {
    const key = condition.toLowerCase();
    if (key === 'gerimis') return t('current.conditions.drizzle');
    if (key === 'cerah') return t('current.conditions.sunny');
    if (key === 'berawan') return t('current.conditions.cloudy');
    if (key === 'mendung') return t('current.conditions.overcast');
    if (key === 'hujan') return t('current.conditions.rain');
    return condition;
  };

  const handlePlatformChange = (_event: MouseEvent<HTMLElement>, value: 'whatsapp' | 'telegram' | null) => {
    if (value) {
      setNotificationPlatform(value);
    }
  };

  const getGpsErrorMessage = (error: GeolocationPositionError) => {
    if (error.code === 1) return t('gps.errors.permissionDenied');
    if (error.code === 2) return t('gps.errors.unavailable');
    if (error.code === 3) return t('gps.errors.timeout');
    return error.message || t('gps.errors.generic');
  };

  const getCurrentPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const resolveGpsLocation = async () => {
    try {
      return await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
    } catch (firstError) {
      const geoError = firstError as GeolocationPositionError;
      if (geoError.code !== 3) {
        throw geoError;
      }

      return getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000,
      });
    }
  };

  const requestGpsLocation = async (mode: GpsRequestMode) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage(t('gps.errors.unsupported'));
      return;
    }

    setGpsStatus('loading');
    setGpsMessage(mode === 'auto' ? t('gps.messages.autoLoading') : t('gps.messages.manualLoading'));

    try {
      const position = await resolveGpsLocation();
      const latitude = Number(position.coords.latitude.toFixed(5));
      const longitude = Number(position.coords.longitude.toFixed(5));
      const accuracy = Number(position.coords.accuracy.toFixed(0));
      let label = `GPS ${latitude}, ${longitude}`;
      let adm4: string | undefined;

      try {
        const resolvedLocation = await locationApi.reverse({ lat: latitude, lon: longitude });
        if (resolvedLocation && resolvedLocation.adm4) {
          label = resolvedLocation.label;
          adm4 = resolvedLocation.adm4;
        } else if (resolvedLocation && resolvedLocation.label) {
          // It resolved partially but no adm4 found
          label = resolvedLocation.label;
        }
      } catch (err) {
        console.warn('Reverse geocoding failed', err);
      }

      setGpsLocation({
        latitude,
        longitude,
        accuracy,
        label,
        adm4,
      });
      setGpsStatus('success');
      setGpsMessage(t('gps.messages.gpsActive', { label }));
      setGpsAutoAttempted(true);
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      setGpsStatus('error');
      setGpsMessage(getGpsErrorMessage(geoError));
      setGpsAutoAttempted(true);
    }
  };

  const handleUseGpsLocation = () => {
    void requestGpsLocation('manual');
  };

  useEffect(() => {
    if (gpsAutoAttempted || gpsLocation) return;
    void requestGpsLocation('auto');
  }, [gpsAutoAttempted, gpsLocation]);

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
      let calendarEvents = events;
      try {
        const latestEvents = await eventApi.getAll();
        if (latestEvents.length) {
          calendarEvents = latestEvents;
        }
      } catch {
        calendarEvents = events;
      }

      const todayEvents = calendarEvents
        .filter((event) => event.tanggal === todayDate)
        .map((event) => ({
          title: event.judul,
          time: event.waktu || undefined,
          category: event.jenis,
          note: event.catatan || undefined,
        }));

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
          customMessage: scheduleMessage.trim() || undefined,
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

  const handleSaveSchedule = async () => {
    const targetContact = scheduleContactFallback?.trim() || scheduleTo.trim();
    if (!targetContact) {
      setScheduleStatus('error');
      setScheduleError(t('whatsapp.scheduleNoContact'));
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
        userId: user?.id,
      });
      setScheduleStatus('success');
    } catch (error: unknown) {
      setScheduleStatus('error');
      setScheduleError(t('whatsapp.scheduleError', { error: error instanceof Error ? error.message : '' }));
    }
  };

  return {
    theme,
    t,
    todayDate,
    gpsLocation,
    notificationPlatform,
    savedContact,
    setSavedContact,
    contactValue,
    setContactValue,
    notifAktif,
    setNotifAktif,
    isSendingTest,
    testStatus,
    testFeedback,
    isCurrentContactSaved,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleTime,
    setScheduleTime,
    schedulePlatform,
    setSchedulePlatform,
    scheduleStatus,
    setScheduleStatus,
    scheduleError,
    gpsStatus,
    gpsMessage,
    forecastData,
    warningsData,
    weatherLoading,
    weatherError,
    fForecast,
    fAlerts,
    displayedCurrentWeather,
    dayNames,
    isRainy,
    isSunny,
    isCloudy,
    currentWeatherCardBackground,
    forecastSectionBackground,
    getForecastDayBackground,
    isWhatsappPlatform,
    contactLabel,
    contactPlaceholder,
    contactHelper,
    getConditionLabel,
    handlePlatformChange,
    handleUseGpsLocation,
    handleTestNotification,
    handleSaveSchedule,
  };
}

export type UseCuacaControllerResult = ReturnType<typeof useCuacaController>;
