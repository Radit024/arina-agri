'use client';

import { useMemo } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import {
  WEATHER_GPS_LOCATION_KEY,
  WEATHER_GPS_AUTO_ATTEMPTED_KEY,
  type GpsLocationSnapshot,
} from '@/lib/weatherLocation';

export function useWeatherLocation() {
  const [gpsLocation, setGpsLocation] = useLocalStorage<GpsLocationSnapshot | null>(
    WEATHER_GPS_LOCATION_KEY,
    null
  );
  const [gpsAutoAttempted, setGpsAutoAttempted] = useLocalStorage<boolean>(
    WEATHER_GPS_AUTO_ATTEMPTED_KEY,
    false
  );

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
    activeLocation,
    activeLocationLabel,
    activeAdm4,
  };
}
