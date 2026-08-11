'use client';

import { useMemo, useEffect, useRef } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/context/AuthContext';
import { notificationScheduleApi } from '@/lib/api';
import {
  WEATHER_GPS_LOCATION_KEY,
  WEATHER_GPS_AUTO_ATTEMPTED_KEY,
  type GpsLocationSnapshot,
} from '@/lib/weatherLocation';

export function useWeatherLocation() {
  const { session } = useAuth();
  const [gpsLocation, setGpsLocation, gpsLocationHydrated] = useLocalStorage<GpsLocationSnapshot | null>(
    WEATHER_GPS_LOCATION_KEY,
    null
  );
  const [gpsAutoAttempted, setGpsAutoAttempted, gpsAutoAttemptedHydrated] = useLocalStorage<boolean>(
    WEATHER_GPS_AUTO_ATTEMPTED_KEY,
    false
  );
  const isWeatherLocationHydrated = gpsLocationHydrated && gpsAutoAttemptedHydrated;

  const hydrationAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isWeatherLocationHydrated || !session?.access_token) return;
    if (hydrationAttemptedRef.current) return;
    hydrationAttemptedRef.current = true;

    if (!gpsLocation?.adm4) {
      notificationScheduleApi.get()
        .then((schedule) => {
          if (schedule.weatherAdm4) {
            setGpsLocation((prev) => {
              if (!prev?.adm4) {
                return {
                  latitude: prev?.latitude || 0,
                  longitude: prev?.longitude || 0,
                  accuracy: prev?.accuracy || 0,
                  adm4: schedule.weatherAdm4,
                  label: schedule.weatherLocationLabel || 'Lokasi Tersimpan',
                };
              }
              return prev;
            });
          }
        })
        .catch((err) => {
          console.warn('[useWeatherLocation] Failed to hydrate from schedule:', err);
        });
    }
  }, [isWeatherLocationHydrated, session?.access_token, gpsLocation?.adm4, setGpsLocation]);

  const activeLocation = useMemo(() => {
    return gpsLocation;
  }, [gpsLocation]);

  const activeLocationLabel = useMemo(() => {
    return gpsLocation?.label || undefined;
  }, [gpsLocation]);

  const activeAdm4 = useMemo(() => {
    return gpsLocation?.adm4;
  }, [gpsLocation]);

  return {
    gpsLocation,
    setGpsLocation,
    gpsAutoAttempted,
    setGpsAutoAttempted,
    isWeatherLocationHydrated,
    activeLocation,
    activeLocationLabel,
    activeAdm4,
  };
}
