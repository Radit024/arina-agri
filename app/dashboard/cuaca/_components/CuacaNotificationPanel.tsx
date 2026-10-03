'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';

import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useMessages } from 'next-intl';

type CuacaNotificationMessages = {
  Weather?: {
    whatsapp?: {
      tutorialSteps?: string[];
    };
  };
};

export interface CuacaNotificationSettingsProps {
  notificationPlatform: 'whatsapp' | 'telegram';
  setNotifAktif: React.Dispatch<React.SetStateAction<boolean>>;
  notifAktif: boolean;
  savedContact: string;
  contactValue: string;
  handleContactValueChange: (value: string) => void;
  handlePlatformChange: (_event: React.MouseEvent<HTMLElement>, value: 'whatsapp' | 'telegram' | null) => void;
  handleSaveNotificationContact: () => Promise<void>;
  isCurrentContactSaved: boolean;
  contactLabel: string;
  contactPlaceholder: string;
  contactHelper: string;
  isWhatsappPlatform: boolean;
  contactSaving: boolean;
  contactSaveStatus: 'idle' | 'success' | 'error';
  contactSaveFeedback: string;
  handleTestNotification: () => Promise<void>;
  isSendingTest: boolean;
  testStatus: 'idle' | 'success' | 'error' | 'skipped';
  testFeedback: string;
}

export interface CuacaNotificationScheduleProps {
  scheduleEnabled: boolean;
  setScheduleEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  scheduleTime: string;
  setScheduleTime: React.Dispatch<React.SetStateAction<string>>;
  schedulePlatform: 'whatsapp' | 'telegram';
  setSchedulePlatform: React.Dispatch<React.SetStateAction<'whatsapp' | 'telegram'>>;
  scheduleStatus: 'idle' | 'success' | 'error';
  setScheduleStatus: React.Dispatch<React.SetStateAction<'idle' | 'success' | 'error'>>;
  scheduleError: string;
  handleSaveSchedule: () => Promise<void>;
}

export interface CuacaNotificationPanelProps {
  theme: Theme;
  t: (key: string, values?: Record<string, string | number>) => string;
  settings: CuacaNotificationSettingsProps;
  schedule: CuacaNotificationScheduleProps;
}

/**
 * Panel integrasi notifikasi: kanal pengiriman, kontak tujuan, tombol uji,
 * dan jadwal pengingat harian.
 *
 * Dipisah dari `CuacaView` karena panel ini berdiri sendiri sebagai form
 * pengaturan dan tidak pernah menyentuh kartu cuaca atau prakiraan.
 */
export function CuacaNotificationPanel({
  theme,
  t,
  settings,
  schedule,
}: CuacaNotificationPanelProps) {
  const intlMessages = useMessages() as CuacaNotificationMessages;

  const {
    notificationPlatform,
    setNotifAktif,
    notifAktif,
    savedContact,
    contactValue,
    handleContactValueChange,
    handlePlatformChange,
    handleSaveNotificationContact,
    isCurrentContactSaved,
    contactLabel,
    contactPlaceholder,
    contactHelper,
    isWhatsappPlatform,
    contactSaving,
    contactSaveStatus,
    contactSaveFeedback,
    handleTestNotification,
    isSendingTest,
    testStatus,
    testFeedback,
  } = settings;

  const {
    scheduleEnabled,
    setScheduleEnabled,
    scheduleTime,
    setScheduleTime,
    schedulePlatform,
    setSchedulePlatform,
    scheduleStatus,
    scheduleError,
    handleSaveSchedule,
  } = schedule;

  return (
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
  );
}

export default CuacaNotificationPanel;
