'use client';

import { useCallback, useRef, useState } from 'react';
import type { LocationSearchResult } from '@/lib/api';
import { locationApi } from '@/lib/api';

/**
 * Pencarian lokasi manual dan pemrosesan GPS.
 *
 * Dipisah dari `useCuacaController` karena jalur ini berdiri sendiri: satu-satunya
 * interaksinya dengan state cuaca adalah lewat callback `onLocationResolved`.
 *
 * Pencarian memakai penanda request (`requestId`) supaya respons yang telat
 * dari kueri lama tidak menimpa hasil kueri baru yang sudah diketik pengguna.
 */
export function useCuacaoLocationSearch({
  t,
  onLocationResolved,
  onAttempted,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  onLocationResolved: (location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    adm4?: string;
    label: string;
  }) => void;
  onAttempted: () => void;
}) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState('');

  // Pencarian lokasi manual: jalur keluar ketika GPS tidak tersedia.
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationSearchResult[]>([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locationSearchError, setLocationSearchError] = useState('');
  const locationRequestIdRef = useRef(0);

  const getGpsErrorMessage = useCallback((error: GeolocationPositionError) => {
    if (error.code === 1) return t('gps.errors.permissionDenied');
    if (error.code === 2) return t('gps.errors.unavailable');
    if (error.code === 3) return t('gps.errors.timeout');
    return error.message || t('gps.errors.generic');
  }, [t]);

  const getCurrentPosition = useCallback(
    (options: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      }),
    [],
  );

  const resolveGpsLocation = useCallback(async () => {
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

      // Timeout sering terjadi di sinyal buruk; coba lagi dengan akurasi rendah
      // dan cache yang lebih longa sebelum menyerah.
      return getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000,
      });
    }
  }, [getCurrentPosition]);

  const requestGpsLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage(t('gps.errors.unsupported'));
      return;
    }

    setGpsStatus('loading');
    setGpsMessage(t('gps.messages.manualLoading'));

    try {
      const position = await resolveGpsLocation();
      const latitude = Number(position.coords.latitude.toFixed(5));
      const longitude = Number(position.coords.longitude.toFixed(5));
      const accuracy = Number(position.coords.accuracy.toFixed(0));
      let label = `GPS ${latitude}, ${longitude}`;
      let adm4: string | undefined;

      try {
        const resolvedLocation = await locationApi.reverse({ lat: latitude, lon: longitude });
        if (resolvedLocation?.adm4) {
          label = resolvedLocation.label;
          adm4 = resolvedLocation.adm4;
        } else if (resolvedLocation?.label) {
          // Ter-resolve sebagian tapi adm4 tidak ditemukan.
          label = resolvedLocation.label;
        }
      } catch (err) {
        console.warn('Reverse geocoding failed', err);
      }

      onLocationResolved({ latitude, longitude, accuracy, label, adm4 });
      setGpsStatus('success');
      setGpsMessage(t('gps.messages.gpsActive', { label }));
      onAttempted();
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      setGpsStatus('error');
      setGpsMessage(getGpsErrorMessage(geoError));
      onAttempted();
    }
  }, [getGpsErrorMessage, onAttempted, onLocationResolved, resolveGpsLocation, t]);

  const handleUseGpsLocation = () => {
    void requestGpsLocation();
  };

  const handleLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    if (!value.trim()) {
      setLocationResults([]);
      setLocationSearchStatus('idle');
      setLocationSearchError('');
      locationRequestIdRef.current += 1;
    }
  };

  const searchLocations = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 3) return;

      locationRequestIdRef.current += 1;
      const requestId = locationRequestIdRef.current;
      setLocationSearchStatus('loading');
      setLocationSearchError('');

      try {
        const results = await locationApi.search({ query: trimmed, limit: 6 });
        if (requestId !== locationRequestIdRef.current) return;
        setLocationResults(results);
        setLocationSearchStatus('idle');
      } catch (error: unknown) {
        if (requestId !== locationRequestIdRef.current) return;
        setLocationResults([]);
        setLocationSearchStatus('error');
        setLocationSearchError(error instanceof Error ? error.message : t('location.searchError'));
      }
    },
    [t],
  );

  const handleSelectLocation = useCallback(
    (selected: LocationSearchResult) => {
      onLocationResolved({
        latitude: selected.latitude,
        longitude: selected.longitude,
        accuracy: 0,
        adm4: selected.adm4,
        label: selected.label,
      });
      setGpsStatus('success');
      setGpsMessage(t('gps.messages.gpsActive', { label: selected.label }));
      onAttempted();
      setLocationResults([]);
      setLocationQuery('');
    },
    [onAttempted, onLocationResolved, t],
  );

  return {
    gpsStatus,
    gpsMessage,
    // Diekspos agar efek hidrasi lokasi GPS tersimpan di `useCuacaoController`
    // bisa memperbarui status yang sama setelah adm4 berhasil di-resolve.
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
  };
}
