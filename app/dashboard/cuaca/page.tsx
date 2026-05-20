'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import GrainIcon from '@mui/icons-material/Grain';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';

import {
  eventApi,
  notificationApi,
  notificationScheduleApi,
  weatherApi,
  type BmkgForecastResponse,
  type BmkgWarningsResponse,
} from '@/lib/api';
import { formatDateShort } from '@/lib/formatters';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useLocale, useTranslations } from 'next-intl';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';
const WEATHER_TELEGRAM_CONTACT_KEY = 'arina-weather-telegram-contact';
const WEATHER_GPS_LOCATION_KEY = 'arina-weather-gps-location';
const WEATHER_MANUAL_LOCATION_KEY = 'arina-weather-manual-location';
const WEATHER_GPS_AUTO_ATTEMPTED_KEY = 'arina-weather-gps-auto-attempted';

interface GpsLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
}

type GpsRequestMode = 'auto' | 'manual';

function WeatherIcon({ kondisi, size = 'medium' }: { kondisi: string; size?: 'small' | 'medium' | 'large' }) {
  const theme = useTheme();
  const fontSize = size === 'small' ? 20 : size === 'large' ? 48 : 32;
  if (kondisi === 'cerah') return <WbSunnyIcon sx={{ fontSize, color: theme.palette.warning.main }} />;
  if (kondisi === 'berawan') return <CloudIcon sx={{ fontSize, color: theme.palette.grey[400] }} />;
  if (kondisi === 'hujan') return <UmbrellaIcon sx={{ fontSize, color: theme.palette.info.main }} />;
  return <GrainIcon sx={{ fontSize, color: theme.palette.info.light }} />;
}

import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/hooks/useCalendar';

export default function CuacaPage() {
  const theme = useTheme();
  const t = useTranslations('Weather');
  const locale = useLocale();
  const { user } = useAuth();
  const { events } = useCalendar();
  const todayDate = new Intl.DateTimeFormat('en-CA').format(new Date());
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
  const [scheduleMessage, setScheduleMessage] = useState('Pengingat harian: cek kondisi cuaca dan rencana kerja hari ini.');
  const [scheduleStatus, setScheduleStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleReady, setScheduleReady] = useState(false);
  const [gpsLocation, setGpsLocation] = useLocalStorage<GpsLocationSnapshot | null>(WEATHER_GPS_LOCATION_KEY, null);
  const [manualLocation, setManualLocation] = useLocalStorage<string>(WEATHER_MANUAL_LOCATION_KEY, '');
  const [gpsAutoAttempted, setGpsAutoAttempted] = useLocalStorage<boolean>(WEATHER_GPS_AUTO_ATTEMPTED_KEY, false);
  const [manualLocationInput, setManualLocationInput] = useState(manualLocation);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState('');
  const [forecastData, setForecastData] = useState<BmkgForecastResponse | null>(null);
  const [warningsData, setWarningsData] = useState<BmkgWarningsResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const scheduleContactFallback = schedulePlatform === 'telegram' ? storedTelegram : storedWhatsapp;
  const activeLocationLabel = gpsLocation?.label || manualLocation || undefined;

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

        if (!activeLocationLabel) {
          setForecastData(null);
          setWeatherLoading(false);
          return;
        }

        const forecast = await weatherApi.getForecast({ locationLabel: activeLocationLabel });
        if (!active) return;
        setForecastData(forecast);
      } catch (error) {
        if (!active) return;
        setWeatherError(error instanceof Error ? error.message : 'Gagal memuat data cuaca BMKG.');
      } finally {
        if (active) setWeatherLoading(false);
      }
    }

    void loadBmkgWeather();

    return () => {
      active = false;
    };
  }, [activeLocationLabel]);

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

  const fallbackLocation = gpsLocation?.label || manualLocation || 'Lokasi tidak diketahui';

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

  const recipientName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Petani';
  const isWhatsappPlatform = notificationPlatform === 'whatsapp';
  const contactLabel = isWhatsappPlatform ? t('whatsapp.phoneLabel') : t('whatsapp.telegramLabel');
  const contactPlaceholder = isWhatsappPlatform ? t('whatsapp.phonePlaceholder') : t('whatsapp.telegramPlaceholder');
  const contactHelper = isWhatsappPlatform
    ? t('whatsapp.phoneHelper')
    : t('whatsapp.telegramHelper');

  const handlePlatformChange = (_event: MouseEvent<HTMLElement>, value: 'whatsapp' | 'telegram' | null) => {
    if (value) {
      setNotificationPlatform(value);
    }
  };

  const getGpsErrorMessage = (error: GeolocationPositionError) => {
    if (error.code === 1) return 'Izin lokasi ditolak. Aktifkan izin lokasi atau gunakan lokasi manual.';
    if (error.code === 2) return 'Lokasi tidak tersedia. Coba lagi atau gunakan lokasi manual.';
    if (error.code === 3) return 'GPS timeout. Coba lagi atau gunakan lokasi manual.';
    return error.message || 'Tidak bisa mengakses GPS.';
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
      setGpsMessage('GPS tidak tersedia di perangkat ini.');
      return;
    }

    setGpsStatus('loading');
    setGpsMessage(mode === 'auto' ? 'Mengaktifkan GPS otomatis...' : 'Mengambil lokasi GPS...');

    try {
      const position = await resolveGpsLocation();
      const latitude = Number(position.coords.latitude.toFixed(5));
      const longitude = Number(position.coords.longitude.toFixed(5));
      const accuracy = Number(position.coords.accuracy.toFixed(0));
      let label = `GPS ${latitude}, ${longitude}`;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          label = data.address?.village || data.address?.suburb || data.address?.city || data.address?.county || label;
        }
      } catch (e) {
        // Abaikan
      }

      setGpsLocation({
        latitude,
        longitude,
        accuracy,
        label,
      });
      setManualLocation('');
      setManualLocationInput('');
      setGpsStatus('success');
      setGpsMessage(`Lokasi GPS aktif: ${label}`);
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

  const handleSaveManualLocation = () => {
    const trimmed = manualLocationInput.trim();
    if (!trimmed) return;

    setManualLocation(trimmed);
    setGpsLocation(null);
    setGpsStatus('success');
    setGpsMessage(`Lokasi manual aktif: ${trimmed}`);
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

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
        <Grid container spacing={1.25} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Button
              variant="outlined"
              onClick={handleUseGpsLocation}
              disabled={gpsStatus === 'loading'}
              sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
            >
              {gpsStatus === 'loading' ? 'Mengaktifkan GPS...' : 'Nyalakan GPS'}
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              size="small"
              label="Lokasi Manual"
              placeholder="Contoh: Desa Wonorejo, Malang"
              value={manualLocationInput}
              onChange={(event) => setManualLocationInput(event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Button
              variant="contained"
              onClick={handleSaveManualLocation}
              disabled={!manualLocationInput.trim()}
              sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
            >
              Gunakan Lokasi Manual
            </Button>
          </Grid>
        </Grid>
        {(gpsLocation || manualLocation) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Lokasi aktif: {gpsLocation ? `${gpsLocation.label} (akurasi ${gpsLocation.accuracy}m)` : manualLocation}
          </Typography>
        )}
        {gpsStatus === 'success' && gpsMessage && (
          <Alert severity="success" sx={{ mt: 1.25 }}>
            {gpsMessage}
          </Alert>
        )}
        {gpsStatus === 'error' && gpsMessage && (
          <Alert severity="error" sx={{ mt: 1.25 }}>
            {gpsMessage}
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Current Weather */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ background: currentWeatherCardBackground, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            {isRainy && (
              <Box className="weather-rain-layer" aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                  <Box
                    key={`rain-drop-${i}`}
                    className="weather-rain-drop"
                    sx={{
                      left: `${6 + i * 6}%`,
                      animationDelay: `${(i % 5) * 0.2}s`,
                      animationDuration: `${1.05 + (i % 3) * 0.2}s`,
                    }}
                  />
                ))}
              </Box>
            )}

            {isSunny && (
              <Box className="weather-sun-layer" aria-hidden>
                <Box className="weather-sun-ring" />
                <Box className="weather-sun-core" />
              </Box>
            )}

            {isCloudy && (
              <Box className="weather-cloud-layer" aria-hidden>
                <Box className="weather-cloud weather-cloud-a" />
                <Box className="weather-cloud weather-cloud-b" />
                <Box className="weather-cloud weather-cloud-c" />
              </Box>
            )}

            <CardContent sx={{ p: 3 }}>
              {forecastData ? (
                <>
                  <Box className="flex items-start justify-between">
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('current.title')}
                      </Typography>
                      <Typography variant="h3" sx={{ fontFamily: 'var(--font-sora)', mt: 0.5, color: '#fff', fontWeight: 700 }}>
                        {displayedCurrentWeather.suhu}°C
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5, textTransform: 'capitalize' }}>
                        {displayedCurrentWeather.kondisi === 'gerimis' ? t('current.drizzle') : displayedCurrentWeather.kondisi}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                        📍 {displayedCurrentWeather.lokasi}
                      </Typography>
                    </Box>
                    <WeatherIcon kondisi={displayedCurrentWeather.kondisi} size="large" />
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2.5 }} />

                  <Grid container spacing={2}>
                    {[
                      { icon: <WaterDropIcon />, label: t('current.humidity'), value: `${displayedCurrentWeather.kelembapan}%` },
                      { icon: <GrainIcon />, label: t('current.rainfall'), value: `${displayedCurrentWeather.curahHujan} mm` },
                      { icon: <AirIcon />, label: t('current.windSpeed'), value: `${displayedCurrentWeather.kecepatanAngin} km/j` },
                      { icon: <ThermostatIcon />, label: t('current.temperature'), value: `${displayedCurrentWeather.suhu}°C` },
                    ].map((item) => (
                      <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
                        <Box className="flex items-center gap-2">
                          <Box sx={{ color: 'rgba(255,255,255,0.7)' }}>{item.icon}</Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>{item.label}</Typography>
                            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{item.value}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CloudIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.5)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#fff', mb: 1, fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
                    Belum ada data cuaca
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Nyalakan GPS atau isi lokasi manual untuk mendapatkan data cuaca terkini.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {(forecastData?.attribution || weatherError) && (
            <Box sx={{ mt: 1.25 }}>
              {forecastData?.attribution && (
                <Typography variant="caption" color="text.secondary">
                  {forecastData.attribution}{forecastData.isFallback ? ' - menggunakan data cadangan.' : ''}
                </Typography>
              )}
              {weatherError && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Gagal memuat data BMKG terbaru. Menampilkan data cuaca cadangan.
                </Alert>
              )}
            </Box>
          )}

          {/* BMKG 3-Day Forecast */}
          <Card sx={{ mt: 3 }}>
            <CardHeader
              title={
                <Box className="flex items-center gap-2">
                  <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
                    Prakiraan 3 Hari BMKG
                  </Typography>
                  {weatherLoading && <CircularProgress size={16} />}
                </Box>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {warningsData?.warnings.length ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {warningsData.warnings[0].headline || warningsData.warnings[0].description}
                </Alert>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 1,
                  width: '100%',
                }}
              >
                {fForecast.map((day) => {
                  const date = new Date(day.tanggal);
                  const dayName = dayNames[date.getDay()];
                  const dateNum = date.getDate();
                  const isToday = day.tanggal === todayDate;
                  return (
                    <Box
                      key={day.tanggal}
                      sx={{
                        flex: { xs: '0 0 90px', md: '1 1 0' },
                        minWidth: { xs: 90, md: 0 },
                        p: 2,
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: isToday ? 'primary.main' : 'divider',
                        backgroundColor: isToday ? 'primary.light' : 'transparent',
                      }}
                    >
                      <Typography variant="caption" color={isToday ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                        {isToday ? t('forecast.today') : `${dayName} ${dateNum}`}
                      </Typography>
                      <Box sx={{ my: 1 }}>
                        <WeatherIcon kondisi={day.kondisi} size="small" />
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{day.suhuMax}°</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{day.suhuMin}°</Typography>
                      {day.curahHujan > 0 && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#3b82f6', mt: 0.5 }}>
                          💧{day.curahHujan}mm
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Alert History */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('history.title')}</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {[t('history.columns.date'), t('history.columns.alertType'), t('history.columns.message'), t('history.columns.status')].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fAlerts.map((alert) => (
                      <TableRow key={alert.id} sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{formatDateShort(alert.tanggal)}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{alert.jenisPeringatan}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: 280 }}>
                          <Typography variant="caption" noWrap sx={{ display: 'block' }}>{alert.pesan}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.status === 'terkirim' ? t('history.status.sent') : t('history.status.failed')}
                            size="small"
                            sx={{
                              backgroundColor: alert.status === 'terkirim' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12),
                              color: alert.status === 'terkirim' ? theme.palette.success.main : theme.palette.error.main,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Integration */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardHeader
                avatar={isWhatsappPlatform ? <WhatsAppIcon sx={{ color: '#25d366' }} /> : <TelegramIcon sx={{ color: '#229ED9' }} />}
                title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('whatsapp.title')}</Typography>}
              />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ backgroundColor: isWhatsappPlatform ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.info.main, 0.12), borderRadius: 2, p: 2, mb: 2.5, border: isWhatsappPlatform ? `1px solid ${alpha(theme.palette.success.main, 0.3)}` : `1px solid ${alpha(theme.palette.info.main, 0.3)}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {t('whatsapp.note')}
                  </Typography>
                </Box>

                <ToggleButtonGroup fullWidth exclusive value={notificationPlatform} onChange={handlePlatformChange} sx={{ mb: 2.5 }}>
                  <ToggleButton value="whatsapp" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    <WhatsAppIcon sx={{ mr: 1, color: '#25d366' }} /> WhatsApp
                  </ToggleButton>
                  <ToggleButton value="telegram" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    <TelegramIcon sx={{ mr: 1, color: '#229ED9' }} /> Telegram
                  </ToggleButton>
                </ToggleButtonGroup>

                <FormControlLabel
                  control={
                    <Switch
                      checked={notifAktif}
                      onChange={(e) => setNotifAktif(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {t('whatsapp.enable')}
                    </Typography>
                  }
                  sx={{ mb: 2.5, display: 'flex' }}
                />

                <TextField
                  fullWidth
                  label={contactLabel}
                  placeholder={contactPlaceholder}
                  value={contactValue}
                  onChange={(e) => setContactValue(isWhatsappPlatform ? e.target.value.replace(/\D/g, '') : e.target.value)}
                  helperText={contactHelper}
                  slotProps={{ htmlInput: isWhatsappPlatform ? { inputMode: 'numeric', pattern: '[0-9]*' } : undefined }}
                  disabled={!notifAktif}
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant={isCurrentContactSaved ? 'outlined' : 'contained'}
                  color={isCurrentContactSaved ? 'success' : 'primary'}
                  disabled={!notifAktif || !contactValue.trim()}
                  onClick={() => setSavedContact(contactValue.trim())}
                  startIcon={isWhatsappPlatform ? <WhatsAppIcon /> : <TelegramIcon />}
                >
                  {isCurrentContactSaved ? t('whatsapp.saved') : t('whatsapp.saveAndEnable')}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleTestNotification}
                  disabled={!notifAktif || !(savedContact || contactValue).trim() || isSendingTest}
                  sx={{ mt: 1.5 }}
                >
                  {isSendingTest ? <CircularProgress size={20} /> : t('whatsapp.testButton', { platform: notificationPlatform === 'whatsapp' ? 'WhatsApp' : 'Telegram' })}
                </Button>

                {testStatus === 'success' && (
                  <Alert severity="success" sx={{ mt: 1.5 }}>
                    {testFeedback || t('whatsapp.testSuccess')}
                  </Alert>
                )}

                {testStatus === 'skipped' && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    {testFeedback}
                  </Alert>
                )}

                {testStatus === 'error' && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {testFeedback || t('whatsapp.testError')}
                  </Alert>
                )}

                {notifAktif && (
                  <Box sx={{ mt: 3, display: { xs: 'block', md: 'flex' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        {t('whatsapp.activeAlertTypes')}
                      </Typography>
                      {[t('whatsapp.alerts.heavyRain'), t('whatsapp.alerts.strongWind'), t('whatsapp.alerts.extremeTemp'), t('whatsapp.alerts.lowHumidity')].map((item) => (
                        <Box key={item} className="flex items-center gap-2 mt-2">
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'primary.main' }} />
                          <Typography variant="caption" color="text.secondary">{item}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {notificationPlatform === 'telegram' && (
                      <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, backgroundColor: '#f8fafc' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          {t('whatsapp.tutorialTitle')}
                        </Typography>
                        {(t.raw('whatsapp.tutorialSteps') as string[]).map((step: string) => (
                          <Box key={step} className="flex items-start gap-2 mt-2">
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#229ED9', mt: '6px' }} />
                            <Typography variant="caption" color="text.secondary">{step}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('whatsapp.scheduleTitle')}</Typography>}
                subheader={t('whatsapp.scheduleSub')}
              />
              <CardContent sx={{ pt: 0 }}>
                <ToggleButtonGroup
                  exclusive
                  value={schedulePlatform}
                  onChange={(_event, value) => value && setSchedulePlatform(value)}
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="whatsapp" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    <WhatsAppIcon sx={{ mr: 1, color: '#25d366' }} /> WhatsApp
                  </ToggleButton>
                  <ToggleButton value="telegram" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    <TelegramIcon sx={{ mr: 1, color: '#229ED9' }} /> Telegram
                  </ToggleButton>
                </ToggleButtonGroup>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="time"
                      label={t('whatsapp.scheduleTime')}
                      value={scheduleTime}
                      onChange={(e) => {
                        setScheduleTime(e.target.value);
                        setScheduleStatus('idle');
                      }}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>

                <Box className="flex items-center justify-between" sx={{ mt: 3, gap: 2, flexWrap: 'wrap' }}>
                  <Box className="flex items-center gap-2">
                    <Switch
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      color="primary"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('whatsapp.scheduleActive')}</Typography>
                  </Box>
                  <Button variant="contained" sx={{ borderRadius: 2 }} onClick={handleSaveSchedule}>
                    {t('whatsapp.scheduleSave')}
                  </Button>
                </Box>

                {scheduleStatus === 'success' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {t('whatsapp.scheduleSuccess')}
                  </Alert>
                )}

                {scheduleStatus === 'error' && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {scheduleError}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
      </Grid>
    </Box>
  );
}
