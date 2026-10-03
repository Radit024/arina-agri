'use client';

import { useTheme } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useAuth } from '@/context/AuthContext';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import {
  locationApi,
  weatherApi,
  type BmkgForecastResponse,
  type BmkgWarningsResponse,
} from '@/lib/api';
import { filterWeatherWarningsByLocation } from '@/lib/dashboard/summary';

import { useCuacaoLocationSearch } from './useCuacaoLocationSearch';
import { useNotificationSettings } from './useNotificationSettings';
import { useNotificationSchedule } from './useNotificationSchedule';

export function useCuacaController() {
  const theme = useTheme();
  const t = useTranslations('Weather');
  const locale = useLocale();
  const { user } = useAuth();
  const todayDate = new Intl.DateTimeFormat('en-CA').format(new Date());

  const {
    gpsLocation,
    setGpsLocation,
    setGpsAutoAttempted,
    activeAdm4,
    activeLocationLabel,
  } = useWeatherLocation();

  const {
    gpsStatus,
    gpsMessage,
    setGpsStatus,
    setGpsMessage,
    locationQuery,
    locationResults,
    locationSearchStatus,
    locationSearchError,
    searchLocations,
    handleUseGpsLocation,
    handleLocationQueryChange,
    handleSelectLocation,
  } = useCuacaoLocationSearch({
    t,
    onLocationResolved: setGpsLocation,
    onAttempted: () => setGpsAutoAttempted(true),
  });

  const [forecastData, setForecastData] = useState<BmkgForecastResponse | null>(null);
  const [warningsData, setWarningsData] = useState<BmkgWarningsResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const gpsAdm4LookupAttemptsRef = useRef(new Set<string>());
  const weatherAdm4LookupAttemptsRef = useRef(new Set<string>());

  const missingBmkgLocationMessage = t('errors.missingBmkgLocation');
  const loadBmkgErrorMessage = t('errors.loadBmkg');

  useEffect(() => {
    if (!gpsLocation || gpsLocation.adm4) return;

    const savedGpsLocation = gpsLocation;
    const lookupKey = `${savedGpsLocation.latitude}:${savedGpsLocation.longitude}`;
    if (gpsAdm4LookupAttemptsRef.current.has(lookupKey)) return;
    gpsAdm4LookupAttemptsRef.current.add(lookupKey);

    let active = true;

    async function resolveSavedGpsAdm4() {
      try {
        const resolvedLocation = await locationApi.reverse({
          lat: savedGpsLocation.latitude,
          lon: savedGpsLocation.longitude,
        });

        if (!active || !resolvedLocation.adm4) return;

        const resolvedLabel = resolvedLocation.label || savedGpsLocation.label;
        setGpsLocation({
          ...savedGpsLocation,
          label: resolvedLabel,
          adm4: resolvedLocation.adm4,
        });
        setGpsStatus('success');
        setGpsMessage(t('gps.messages.gpsActive', { label: resolvedLabel }));
      } catch (error) {
        console.warn('Saved GPS location could not be mapped to BMKG adm4', error);
      }
    }

    void resolveSavedGpsAdm4();

    return () => {
      active = false;
    };
  }, [gpsLocation, setGpsLocation, setGpsMessage, setGpsStatus, t]);

  useEffect(() => {
    let active = true;

    async function loadBmkgWeather() {
      try {
        setWeatherLoading(true);
        setWeatherError('');

        let currentAdm4 = activeAdm4;
        let currentLabel = activeLocationLabel;

        if (!currentAdm4 && gpsLocation) {
          const lookupKey = `${gpsLocation.latitude}:${gpsLocation.longitude}`;
          if (!weatherAdm4LookupAttemptsRef.current.has(lookupKey)) {
            weatherAdm4LookupAttemptsRef.current.add(lookupKey);
            try {
              const resolvedLocation = await locationApi.reverse({
                lat: gpsLocation.latitude,
                lon: gpsLocation.longitude,
              });

              if (resolvedLocation.adm4) {
                currentAdm4 = resolvedLocation.adm4;
                currentLabel = resolvedLocation.label || currentLabel;
                setGpsLocation({
                  ...gpsLocation,
                  label: currentLabel || gpsLocation.label,
                  adm4: resolvedLocation.adm4,
                });
              }
            } catch (error) {
              console.warn('Weather GPS location could not be mapped to BMKG adm4', error);
            }
          }
        }

        if (!currentAdm4) {
          setForecastData(null);
          setWarningsData(null);
          if (currentLabel) {
            setWeatherError(missingBmkgLocationMessage);
          }
          return;
        }

        const [forecast, warnings] = await Promise.all([
          weatherApi.getForecast({ adm4: currentAdm4, locationLabel: currentLabel }),
          weatherApi.getWarnings(),
        ]);
        if (!active) return;
        setForecastData(forecast);
        setWarningsData({
          ...warnings,
          warnings: filterWeatherWarningsByLocation(warnings.warnings, forecast.locationLabel || currentLabel),
        });
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
  }, [activeAdm4, activeLocationLabel, gpsLocation, loadBmkgErrorMessage, missingBmkgLocationMessage, setGpsLocation]);

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
  const forecastSectionBackground = theme.palette.background.paper;
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

  const scheduleMessageRef = useRef('');

  const notificationSettings = useNotificationSettings({
    user,
    t,
    locale,
    recipientName,
    displayedCurrentWeather,
    warningsData,
    todayDate,
    getScheduleMessage: () => scheduleMessageRef.current,
  });

  const notificationSchedule = useNotificationSchedule({
    user,
    t,
    recipientName,
    activeAdm4,
    activeLocationLabel,
    displayedLocation: displayedCurrentWeather.lokasi,
    missingBmkgLocationMessage,
    storedWhatsapp: notificationSettings.storedWhatsapp,
    storedTelegram: notificationSettings.storedTelegram,
  });

  useEffect(() => {
    scheduleMessageRef.current = notificationSchedule.scheduleMessage;
  }, [notificationSchedule.scheduleMessage]);

  const getConditionLabel = (condition: string) => {
    const key = condition.toLowerCase();
    if (key === 'gerimis') return t('current.conditions.drizzle');
    if (key === 'cerah') return t('current.conditions.sunny');
    if (key === 'berawan') return t('current.conditions.cloudy');
    if (key === 'mendung') return t('current.conditions.overcast');
    if (key === 'hujan') return t('current.conditions.rain');
    return condition;
  };

  return {
    theme,
    t,
    todayDate,
    gpsLocation,
    notificationPlatform: notificationSettings.notificationPlatform,
    savedContact: notificationSettings.savedContact,
    contactValue: notificationSettings.contactValue,
    notifAktif: notificationSettings.notifAktif,
    setNotifAktif: notificationSettings.setNotifAktif,
    isSendingTest: notificationSettings.isSendingTest,
    testStatus: notificationSettings.testStatus,
    testFeedback: notificationSettings.testFeedback,
    contactSaving: notificationSettings.contactSaving,
    contactSaveStatus: notificationSettings.contactSaveStatus,
    contactSaveFeedback: notificationSettings.contactSaveFeedback,
    isCurrentContactSaved: notificationSettings.isCurrentContactSaved,
    scheduleEnabled: notificationSchedule.scheduleEnabled,
    setScheduleEnabled: notificationSchedule.setScheduleEnabled,
    scheduleTime: notificationSchedule.scheduleTime,
    setScheduleTime: notificationSchedule.setScheduleTime,
    schedulePlatform: notificationSchedule.schedulePlatform,
    setSchedulePlatform: notificationSchedule.setSchedulePlatform,
    scheduleStatus: notificationSchedule.scheduleStatus,
    setScheduleStatus: notificationSchedule.setScheduleStatus,
    scheduleError: notificationSchedule.scheduleError,
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
    isWhatsappPlatform: notificationSettings.isWhatsappPlatform,
    contactLabel: notificationSettings.contactLabel,
    contactPlaceholder: notificationSettings.contactPlaceholder,
    contactHelper: notificationSettings.contactHelper,
    getConditionLabel,
    handleContactValueChange: notificationSettings.handleContactValueChange,
    handlePlatformChange: notificationSettings.handlePlatformChange,
    handleSaveNotificationContact: notificationSettings.handleSaveNotificationContact,
    handleUseGpsLocation,
    locationQuery,
    handleLocationQueryChange,
    locationResults,
    locationSearchStatus,
    locationSearchError,
    searchLocations,
    handleSelectLocation,
    handleTestNotification: notificationSettings.handleTestNotification,
    handleSaveSchedule: notificationSchedule.handleSaveSchedule,
    notificationSettings,
    notificationSchedule,
  };
}

export type UseCuacaControllerResult = ReturnType<typeof useCuacaController>;
