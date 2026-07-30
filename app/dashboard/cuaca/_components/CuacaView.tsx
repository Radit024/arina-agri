'use client';

import AirIcon from '@mui/icons-material/Air';
import CloudIcon from '@mui/icons-material/Cloud';
import GrainIcon from '@mui/icons-material/Grain';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TelegramIcon from '@mui/icons-material/Telegram';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { useMessages } from 'next-intl';

import { PageActionButton, PageHeader, PageShell } from '@/components/shared/page';
import { formatDateShort } from '@/lib/formatters';

function WeatherIcon({ kondisi, size = 'medium' }: { kondisi: string; size?: 'small' | 'medium' | 'large' }) {
  const theme = useTheme();
  const fontSize = size === 'small' ? 20 : size === 'large' ? 48 : 32;
  if (kondisi === 'cerah') return <WbSunnyIcon sx={{ fontSize, color: theme.palette.warning.main }} />;
  if (kondisi === 'berawan') return <CloudIcon sx={{ fontSize, color: theme.palette.grey[400] }} />;
  if (kondisi === 'hujan') return <UmbrellaIcon sx={{ fontSize, color: theme.palette.info.main }} />;
  return <GrainIcon sx={{ fontSize, color: theme.palette.info.light }} />;
}

import type { UseCuacaControllerResult } from '@/controllers/cuaca/useCuacaController';

type WeatherMessages = {
  Weather?: {
    whatsapp?: {
      tutorialSteps?: string[];
    };
  };
};

export default function CuacaView({
  theme,
  t,
  todayDate,
  gpsLocation,
  notificationPlatform,
  savedContact,
  contactValue,
  notifAktif,
  setNotifAktif,
  isSendingTest,
  testStatus,
  testFeedback,
  contactSaving,
  contactSaveStatus,
  contactSaveFeedback,
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
  handleContactValueChange,
  handlePlatformChange,
  handleSaveNotificationContact,
  handleUseGpsLocation,
  handleTestNotification,
  handleSaveSchedule,
}: UseCuacaControllerResult) {
  const intlMessages = useMessages() as WeatherMessages;

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        sx={{ mb: 1.5 }}
        actions={(
          <PageActionButton
            data-guide-target="weather-gps"
            data-touch-target="44"
            variant="contained"
            startIcon={gpsStatus === 'loading' ? <CircularProgress color="inherit" size={16} /> : <MyLocationIcon />}
            onClick={handleUseGpsLocation}
            disabled={gpsStatus === 'loading'}
            sx={{ width: { xs: '100%', sm: 'auto' }, px: 2.25, fontWeight: 700 }}
          >
            {gpsStatus === 'loading' ? t('gps.buttons.loading') : t('gps.buttons.enable')}
          </PageActionButton>
        )}
      />
      <Box sx={{ mb: 3 }}>
        {gpsLocation && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('location.active', {
              location: t('location.gpsWithAccuracy', { label: gpsLocation.label, accuracy: gpsLocation.accuracy }),
            })}
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
        <Grid
          data-weather-history-layout="stretch-column"
          size={{ xs: 12, lg: 8 }}
          sx={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}
        >
          <Card
            data-guide-target="weather-current"
            data-guide-loading={weatherLoading && !forecastData ? 'true' : undefined}
            sx={{ background: currentWeatherCardBackground, color: '#fff', position: 'relative', overflow: 'hidden' }}
          >
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

            <CardContent sx={{ p: { xs: 2.25, md: 3 }, minHeight: { xs: 312, sm: 278 } }}>
              {weatherLoading && !forecastData ? (
                <Box data-weather-loading="current" sx={{ display: 'grid', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width={96} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.22)' }} />
                      <Skeleton width="45%" height={64} sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.28)' }} />
                      <Skeleton width="58%" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                      <Skeleton width="76%" height={22} sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.18)' }} />
                    </Box>
                    <Skeleton variant="circular" width={56} height={56} sx={{ bgcolor: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
                  </Box>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Grid container spacing={2}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Grid key={`current-weather-skeleton-${index}`} size={{ xs: 6, sm: 3 }}>
                        <Skeleton width="78%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.18)' }} />
                        <Skeleton width="52%" height={24} sx={{ bgcolor: 'rgba(255,255,255,0.26)' }} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : forecastData ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('current.title')}
                      </Typography>
                      <Typography variant="h3" sx={{ fontFamily: 'var(--font-sora)', mt: 0.5, color: '#fff', fontWeight: 700 }}>
                        {displayedCurrentWeather.suhu}°C
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5, textTransform: 'capitalize' }}>
                        {getConditionLabel(displayedCurrentWeather.kondisi)}
                      </Typography>
                      <Box sx={{ color: 'rgba(255,255,255,0.76)', mt: 1, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <LocationOnIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: 'inherit', overflowWrap: 'anywhere' }}>
                          {displayedCurrentWeather.lokasi}
                        </Typography>
                      </Box>
                    </Box>
                    <WeatherIcon kondisi={displayedCurrentWeather.kondisi} size="large" />
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2.5 }} />

                  <Grid container spacing={2}>
                    {[
                      { icon: <WaterDropIcon />, label: t('current.humidity'), value: `${displayedCurrentWeather.kelembapan}%` },
                      { icon: <GrainIcon />, label: t('current.rainfall'), value: `${displayedCurrentWeather.curahHujan} mm` },
                      { icon: <AirIcon />, label: t('current.windSpeed'), value: t('units.windSpeed', { value: displayedCurrentWeather.kecepatanAngin }) },
                      { icon: <ThermostatIcon />, label: t('current.temperature'), value: `${displayedCurrentWeather.suhu}°C` },
                    ].map((item) => (
                      <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    {t('emptyWeather.title')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {t('emptyWeather.subtitle')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {(forecastData?.attribution || weatherError) && (
            <Box sx={{ mt: 1.25 }}>
              {forecastData?.attribution && (
                <Typography variant="caption" color="text.secondary">
                  {forecastData.attribution}{forecastData.isFallback ? ` - ${t('forecast.usingFallback')}` : ''}
                </Typography>
              )}
              {weatherError && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {weatherError}
                </Alert>
              )}
            </Box>
          )}

          {/* BMKG 3-Day Forecast */}
          <Card
            sx={{
              mt: 3,
              backgroundColor: forecastSectionBackground,
              color: 'text.primary',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
                    {t('forecast.bmkgTitle')}
                  </Typography>
                  {weatherLoading && <CircularProgress size={16} />}
                </Box>
              }
              sx={{ position: 'relative', zIndex: 1, pb: 0.5 }}
            />
            <CardContent sx={{ pt: 1, position: 'relative', zIndex: 1 }}>
              {warningsData?.warnings.length ? (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  {warningsData.warnings[0].headline || warningsData.warnings[0].description}
                </Alert>
              ) : null}
              {weatherLoading && !fForecast.length ? (
                <Box data-weather-loading="forecast" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 1.25, sm: 2 }, width: '100%' }}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={`forecast-skeleton-${index}`} variant="rounded" height={134} sx={{ borderRadius: 3 }} />
                  ))}
                </Box>
              ) : (
                <Box
                  data-weather-forecast-grid="fit-mobile"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: { xs: 1.25, sm: 2 },
                    pb: 0.5,
                    width: '100%',
                    minWidth: 0,
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
                        minWidth: 0,
                        p: { xs: 1.25, sm: 2.25 },
                        borderRadius: 3,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: isToday ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.22)',
                        background: getForecastDayBackground(day.kondisi),
                        backdropFilter: 'blur(10px)',
                        boxShadow: isToday ? '0 14px 30px rgba(0,0,0,0.16)' : '0 10px 24px rgba(0,0,0,0.1)',
                        transition: 'transform 0.18s ease-out, background-color 0.18s ease-out, border-color 0.18s ease-out',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          borderColor: 'rgba(255,255,255,0.62)',
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none',
                          '&:hover': {
                            transform: 'none',
                          },
                        },
                        '& .MuiTypography-root': {
                          color: 'rgba(255,255,255,0.86)',
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255,255,255,0.86)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {isToday ? t('forecast.today') : `${dayName} ${dateNum}`}
                      </Typography>
                      <Box sx={{ my: 1.15, display: 'flex', justifyContent: 'center' }}>
                        <WeatherIcon kondisi={day.kondisi} size="small" />
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{day.suhuMax}°</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{day.suhuMin}°</Typography>
                      {day.curahHujan > 0 && (
                        <Box sx={{ color: 'rgba(255,255,255,0.86)', mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25, minWidth: 0 }}>
                          <WaterDropIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 700 }}>
                            {day.curahHujan}mm
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
                </Box>
              )}
            </CardContent>
          </Card>

          <Card
            data-weather-history-card="fills-empty-space"
            sx={{
              mt: 3,
              display: 'flex',
              flexDirection: 'column',
              flexGrow: { lg: 1 },
              minHeight: { xs: 0, lg: 360 },
            }}
          >
            <CardHeader title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('history.title')}</Typography>} />
            <CardContent sx={{ pt: 0, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <Box data-weather-history-mobile="cards" sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.25 }}>
                {fAlerts.map((alert) => (
                  <Box
                    key={alert.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: alpha(theme.palette.background.default, 0.72),
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {formatDateShort(alert.tanggal)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                          {alert.jenisPeringatan}
                        </Typography>
                      </Box>
                      <Chip
                        label={alert.status === 'terkirim' ? t('history.status.sent') : t('history.status.failed')}
                        size="small"
                        sx={{
                          backgroundColor: alert.status === 'terkirim' ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12),
                          color: alert.status === 'terkirim' ? theme.palette.success.main : theme.palette.error.main,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                      {alert.pesan}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <TableContainer data-weather-history-table="desktop" sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
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
                      <TableRow key={alert.id} sx={{ '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) } }}>
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
            <Box
              data-weather-notification-panel="sticky"
              sx={{
                position: { lg: 'sticky' },
                top: { lg: 24 },
                display: 'grid',
                gap: 3,
              }}
            >
            <Card data-guide-target="weather-notifications">
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
                  <ToggleButton data-touch-target="44" value="whatsapp" disabled sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44, flexDirection: 'column', gap: 0.5, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WhatsAppIcon sx={{ mr: 1, color: '#25d366', opacity: 0.4 }} /> WhatsApp
                    </Box>
                    <Chip label="Segera Hadir" size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem', pointerEvents: 'none' }} />
                  </ToggleButton>
                  <ToggleButton data-touch-target="44" value="telegram" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44 }}>
                    <TelegramIcon sx={{ mr: 1, color: '#229ED9' }} /> Telegram
                  </ToggleButton>
                </ToggleButtonGroup>

                <FormControlLabel
                  data-touch-target="44"
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
                  sx={{ mb: 2.5, display: 'flex', minHeight: 44 }}
                />

                <TextField
                  fullWidth
                  label={contactLabel}
                  placeholder={contactPlaceholder}
                  value={contactValue}
                  onChange={(e) => handleContactValueChange(e.target.value)}
                  helperText={contactHelper}
                  slotProps={{ htmlInput: isWhatsappPlatform ? { inputMode: 'numeric', pattern: '[0-9]*' } : undefined }}
                  disabled={!notifAktif}
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant={isCurrentContactSaved ? 'outlined' : 'contained'}
                  color={isCurrentContactSaved ? 'success' : 'primary'}
                  disabled={!notifAktif || !contactValue.trim() || contactSaving}
                  onClick={handleSaveNotificationContact}
                  startIcon={isWhatsappPlatform ? <WhatsAppIcon /> : <TelegramIcon />}
                  data-touch-target="44"
                  sx={{ minHeight: 44 }}
                >
                  {contactSaving ? <CircularProgress size={20} /> : isCurrentContactSaved ? t('whatsapp.saved') : t('whatsapp.saveAndEnable')}
                </Button>

                {contactSaveStatus === 'success' && (
                  <Alert severity="success" sx={{ mt: 1.5 }}>
                    {contactSaveFeedback || t('whatsapp.saved')}
                  </Alert>
                )}

                {contactSaveStatus === 'error' && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {contactSaveFeedback}
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleTestNotification}
                  disabled={!notifAktif || !(savedContact || contactValue).trim() || isSendingTest}
                  data-touch-target="44"
                  sx={{ mt: 1.5, minHeight: 44 }}
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
                        <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'primary.main' }} />
                          <Typography variant="caption" color="text.secondary">{item}</Typography>
                        </Box>
                      ))}
                    </Box>
                    {notificationPlatform === 'telegram' && (
                      <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.06) }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          {t('whatsapp.tutorialTitle')}
                        </Typography>
                        {((intlMessages?.Weather?.whatsapp?.tutorialSteps || []) as string[]).map((step: string) => (
                          <Box key={step} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
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

            <Card>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('whatsapp.scheduleTitle')}</Typography>}
                subheader={t('whatsapp.scheduleSub')}
              />
              <CardContent sx={{ pt: 0 }}>
                <ToggleButtonGroup
                  fullWidth
                  exclusive
                  value={schedulePlatform}
                  onChange={(_event, value) => value && setSchedulePlatform(value)}
                  sx={{ mb: 2 }}
                >
                  <ToggleButton data-touch-target="44" value="whatsapp" disabled sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44, flexDirection: 'column', gap: 0.5, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WhatsAppIcon sx={{ mr: 1, color: '#25d366', opacity: 0.4 }} /> WhatsApp
                    </Box>
                    <Chip label="Segera Hadir" size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem', pointerEvents: 'none' }} />
                  </ToggleButton>
                  <ToggleButton data-touch-target="44" value="telegram" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 44 }}>
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

                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box data-touch-target="44" sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 44 }}>
                    <Switch
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      color="primary"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('whatsapp.scheduleActive')}</Typography>
                  </Box>
                  <Button data-touch-target="44" variant="contained" sx={{ borderRadius: 2, minHeight: 44, width: { xs: '100%', sm: 'auto' } }} onClick={handleSaveSchedule}>
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
            </Box>
          </Grid>

      </Grid>
    </PageShell>
  );
}
