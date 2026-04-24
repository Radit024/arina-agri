'use client';

import { useEffect, useState } from 'react';
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
import Divider from '@mui/material/Divider';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import GrainIcon from '@mui/icons-material/Grain';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { currentWeather, weatherForecast, weatherAlerts } from '@/lib/mockData';
import { formatDateShort } from '@/lib/formatters';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useTranslations } from 'next-intl';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

function WeatherIcon({ kondisi, size = 'medium' }: { kondisi: string; size?: 'small' | 'medium' | 'large' }) {
  const fontSize = size === 'small' ? 20 : size === 'large' ? 48 : 32;
  if (kondisi === 'cerah') return <WbSunnyIcon sx={{ fontSize, color: '#f59e0b' }} />;
  if (kondisi === 'berawan') return <CloudIcon sx={{ fontSize, color: '#94a3b8' }} />;
  if (kondisi === 'hujan') return <UmbrellaIcon sx={{ fontSize, color: '#3b82f6' }} />;
  return <GrainIcon sx={{ fontSize, color: '#60a5fa' }} />;
}

export default function CuacaPage() {
  const t = useTranslations('Weather');
  const todayDate = new Date().toISOString().split('T')[0];
  const [savedPhone, setSavedPhone] = useLocalStorage<string>(WEATHER_WHATSAPP_PHONE_KEY, '');
  const [hp, setHp] = useState(savedPhone);
  const [notifAktif, setNotifAktif] = useState(true);
  const isWhatsappConfigured = savedPhone.trim().length > 0;
  const isCurrentPhoneSaved = hp.trim().length > 0 && hp.trim() === savedPhone.trim();

  useEffect(() => {
    setHp(savedPhone);
  }, [savedPhone]);

  // Keep current card in sync with the forecast tile marked as "Today".
  const todayForecast = weatherForecast.find((day) => day.tanggal === todayDate);
  const displayedCurrentWeather = todayForecast
    ? {
        ...currentWeather,
        suhu: todayForecast.suhuMax,
        kondisi: todayForecast.kondisi,
        curahHujan: todayForecast.curahHujan,
      }
    : currentWeather;

  const dayNames = [t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat')];
  const currentCondition = displayedCurrentWeather.kondisi.toLowerCase();
  const isRainy = currentCondition === 'hujan' || currentCondition === 'gerimis';
  const isSunny = currentCondition === 'cerah';
  const isCloudy = currentCondition === 'berawan' || currentCondition === 'mendung';

  const currentWeatherCardBackground =
    currentCondition === 'cerah'
      ? 'linear-gradient(135deg, #7c2d12 0%, #c2410c 45%, #f59e0b 100%)'
      : currentCondition === 'berawan' || currentCondition === 'mendung'
        ? 'linear-gradient(135deg, #334155 0%, #475569 55%, #94a3b8 100%)'
        : 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #2563eb 100%)';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Current Weather */}
        <Grid size={{ xs: 12, lg: isWhatsappConfigured ? 12 : 8 }}>
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
            </CardContent>
          </Card>

          {/* 7-Day Forecast */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('forecast.title')}</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 1,
                  width: '100%',
                }}
              >
                {weatherForecast.map((day) => {
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
                    {weatherAlerts.map((alert) => (
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
                              backgroundColor: alert.status === 'terkirim' ? '#dcfce7' : '#fee2e2',
                              color: alert.status === 'terkirim' ? '#16a34a' : '#dc2626',
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

        {/* WhatsApp Integration */}
        {!isWhatsappConfigured && (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardHeader
                avatar={<WhatsAppIcon sx={{ color: '#25d366' }} />}
                title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('whatsapp.title')}</Typography>}
              />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ backgroundColor: '#f0fdf4', borderRadius: 2, p: 2, mb: 2.5, border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {t.rich('whatsapp.note', { strong: (chunks) => <strong>{chunks}</strong> })}
                  </Typography>
                </Box>

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
                  label={t('whatsapp.phoneLabel')}
                  placeholder={t('whatsapp.phonePlaceholder')}
                  value={hp}
                  onChange={(e) => setHp(e.target.value.replace(/\D/g, ''))}
                  helperText={t('whatsapp.phoneHelper')}
                  slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                  disabled={!notifAktif}
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant={isCurrentPhoneSaved ? 'outlined' : 'contained'}
                  color={isCurrentPhoneSaved ? 'success' : 'primary'}
                  disabled={!notifAktif || !hp.trim()}
                  onClick={() => setSavedPhone(hp.trim())}
                  startIcon={<WhatsAppIcon />}
                >
                  {isCurrentPhoneSaved ? t('whatsapp.saved') : t('whatsapp.saveAndEnable')}
                </Button>

                {notifAktif && (
                  <Box sx={{ mt: 3 }}>
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
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
