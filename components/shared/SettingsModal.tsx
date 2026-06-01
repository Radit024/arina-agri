'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';

import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

const SETTINGS_TABS = [
  { id: 'profil', key: 'profile.tab', icon: <PersonOutlineIcon /> },
  { id: 'general', key: 'general.tab', icon: <TuneIcon /> },
  { id: 'notifikasi', key: 'notification.tab', icon: <NotificationsNoneIcon /> },
  { id: 'info', key: 'system.tab', icon: <InfoOutlinedIcon /> },
];

const TAB_CONTENT_MIN_HEIGHT = 380;
type LanguageMode = 'id' | 'en';

export default function SettingsModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations('Settings');
  const locale = useLocale();
  
  const isOpen = searchParams.get('settings') === 'true';
  const initialTab = searchParams.get('tab') || 'general';
  
  const { user } = useAuth();
  const { mode, setThemeMode } = useThemeMode();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = user?.user_metadata?.avatar_url;
  const isGoogleUser = user?.app_metadata?.provider === 'google' || 
                       (user as any)?.identities?.some((id: any) => id.provider === 'google');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [languageMode, setLanguageMode] = useState<LanguageMode>(locale as LanguageMode);
  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [profileWhatsappPhone, setProfileWhatsappPhone] = useState(weatherWhatsappPhone);
  const [telegramId, setTelegramId] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(searchParams.get('tab') || 'general');
    }
  }, [isOpen, searchParams]);

  useEffect(() => {
    setProfileWhatsappPhone(weatherWhatsappPhone);
  }, [weatherWhatsappPhone]);

  const handleClose = () => {
    router.push(pathname, { scroll: false });
  };

  const handleAppearanceChange = (_: MouseEvent<HTMLElement>, nextMode: 'light' | 'dark' | null) => {
    if (nextMode) {
      setThemeMode(nextMode);
    }
  };

  const handleLanguageChange = (event: SelectChangeEvent<LanguageMode>) => {
    const nextLocale = event.target.value as LanguageMode;
    setLanguageMode(nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const handleSaveProfile = () => {
    setWeatherWhatsappPhone(profileWhatsappPhone.trim());
    setProfileSaveSuccess(true);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Mobile: SwipeableDrawer bottom sheet (~55% height)
  // Desktop: Dialog modal (unchanged)
  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={isOpen}
        onClose={handleClose}
        onOpen={() => {}}
        disableSwipeToOpen
        swipeAreaWidth={0}
        ModalProps={{ keepMounted: false }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px 20px 0 0',
              maxHeight: '60vh',
              minHeight: '40vh',
              height: 'auto',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Drag Handle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1.5,
            pb: 0.5,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              bgcolor: 'divider',
            }}
          />
        </Box>

        {/* Mobile Sheet Content: horizontal tab row on top */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Tab Bar */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              px: 2,
              pt: 1,
              pb: 0.5,
              flexShrink: 0,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {SETTINGS_TABS.map((tab) => (
              <Box
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  cursor: 'pointer',
                  flexShrink: 0,
                  bgcolor: activeTab === tab.id ? 'success.light' : 'action.hover',
                  color: activeTab === tab.id ? 'success.dark' : 'text.secondary',
                  transition: 'all 0.18s ease',
                  '& .MuiSvgIcon-root': { fontSize: 16 },
                }}
              >
                {tab.icon}
                <Typography sx={{ fontSize: '0.78rem', fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: 'nowrap' }}>
                  {t(tab.key)}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Scrollable Content */}
          <DialogContent sx={{ p: 2.5, pt: 1.5, overflowY: 'auto', flex: 1 }}>
            {/* GENERAL */}
            {activeTab === 'general' && (
              <Box>
                <Box sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('general.appearance')}</Typography>
                  <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={handleAppearanceChange}
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        px: 1.4,
                        py: 0.4,
                        fontSize: '0.75rem',
                        borderColor: 'divider',
                        color: 'text.secondary',
                      },
                      '& .Mui-selected': {
                        bgcolor: 'success.light',
                        color: 'primary.main',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <ToggleButton value="light">{t('general.modeLight')}</ToggleButton>
                    <ToggleButton value="dark">{t('general.modeDark')}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('general.language')}</Typography>
                  <Select
                    size="small"
                    value={languageMode}
                    onChange={handleLanguageChange}
                    sx={{
                      minWidth: 170,
                      height: 34,
                      '& .MuiSelect-select': {
                        py: 0.6,
                        fontSize: '0.82rem',
                      },
                    }}
                  >
                    <MenuItem value="id">{t('general.languageId')}</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                  </Select>
                </Box>
              </Box>
            )}

            {/* PROFIL */}
            {activeTab === 'profil' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  {t('profile.subtitle')}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Avatar
                    src={userAvatar || undefined}
                    sx={{
                      width: 72,
                      height: 72,
                      backgroundColor: 'action.selected',
                      color: 'text.primary',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                    }}
                  >
                    {!userAvatar && userInitials}
                  </Avatar>
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={isGoogleUser}
                      sx={{ mb: 0.75, borderRadius: 2, color: 'text.primary', borderColor: 'divider', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', py: 0.4 }}
                    >
                      {t('profile.changePhoto')}
                    </Button>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.72rem' }}>
                      {isGoogleUser ? 'Nama & foto dikelola oleh Google' : t('profile.photoHint')}
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={t('profile.fullName')}
                      defaultValue={userName}
                      variant="standard"
                      disabled={isGoogleUser}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={t('profile.mainCommodity')}
                      defaultValue={farmerProfile.komoditas}
                      variant="standard"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label={t('profile.phone')}
                      placeholder={t('profile.phonePlaceholder')}
                      value={profileWhatsappPhone}
                      onChange={(event) => {
                        setProfileWhatsappPhone(event.target.value.replace(/\D/g, ''));
                        setProfileSaveSuccess(false);
                      }}
                      helperText={t('profile.phoneHelper')}
                      slotProps={{
                        htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' },
                        inputLabel: { shrink: true }
                      }}
                      variant="standard"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="ID Telegram"
                      placeholder="@username atau ID"
                      value={telegramId}
                      onChange={(event) => {
                        setTelegramId(event.target.value);
                        setProfileSaveSuccess(false);
                      }}
                      helperText="Opsional untuk notifikasi"
                      slotProps={{ inputLabel: { shrink: true } }}
                      variant="standard"
                    />
                  </Grid>
                </Grid>

                <Box
                  sx={{
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 1.5,
                    mt: 1,
                  }}
                >
                  <Typography variant="caption" align="center" color={profileSaveSuccess ? 'success.main' : 'text.secondary'} sx={{ fontWeight: profileSaveSuccess ? 600 : 400 }}>
                    {profileSaveSuccess ? t('profile.phoneSaved') : t('profile.phoneSaveHint')}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleSaveProfile}
                    sx={{
                      width: '100%',
                      height: 40,
                      borderRadius: 2,
                      textTransform: 'none',
                      bgcolor: 'success.main',
                      '&:hover': { bgcolor: 'success.dark' },
                      color: 'common.white',
                      fontWeight: 700,
                    }}
                  >
                    {t('profile.saveChanges')}
                  </Button>
                </Box>
              </Box>
            )}

            {/* NOTIFIKASI */}
            {activeTab === 'notifikasi' && (
              <Box>
                {[
                  { label: t('notification.items.weather.label'), desc: t('notification.items.weather.desc') },
                  { label: t('notification.items.schedule.label'), desc: t('notification.items.schedule.desc') },
                ].map((item) => (
                  <Box key={item.label} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>{item.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, display: 'block' }}>{item.desc}</Typography>
                      </Box>
                      <Switch defaultChecked color="primary" sx={{ mt: -0.5, flexShrink: 0 }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* INFO */}
            {activeTab === 'info' && (
              <Box>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InfoOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 700 }}>{t('system.appName')}</Typography>
                    <Typography variant="body2" color="text.secondary">{t('system.version')}</Typography>
                  </Box>
                </Box>

                {[
                  { label: t('system.backendLabel'), value: t('system.backendValue') },
                  { label: t('system.layoutLabel'), value: t('system.layoutValue') },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
        </Box>

        {/* Safe area bottom padding */}
        <Box sx={{ pb: 'env(safe-area-inset-bottom)', flexShrink: 0 }} />
      </SwipeableDrawer>
    );
  }

  // Desktop: Dialog (unchanged behavior)
  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            width: '100%',
            height: '560px',
            minHeight: '560px',
            maxHeight: '560px',
            m: 2,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '100%', flex: 1 }}>
        
        {/* Left Navigation (Inner Sidebar) */}
        <Box sx={{ width: { xs: '100%', md: 240 }, bgcolor: 'background.default', borderRight: '1px solid', borderColor: 'divider', p: 2, display: 'flex', flexDirection: 'column' }}>
           <Typography variant="body2" sx={{ px: 2, mb: 2, mt: 1, display: 'block', color: 'text.primary', fontSize: '1rem', fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
             {t('title')}
           </Typography>
           
           <List disablePadding sx={{ flex: 1 }}>
             {SETTINGS_TABS.map((tab) => (
               <ListItem key={tab.id} disablePadding sx={{ mb: 0.5 }}>
                 <ListItemButton
                   onClick={() => setActiveTab(tab.id)}
                   sx={{
                     borderRadius: 2,
                     bgcolor: activeTab === tab.id ? 'success.light' : 'transparent',
                     color: activeTab === tab.id ? 'success.dark' : 'text.secondary',
                     '&:hover': { bgcolor: activeTab === tab.id ? 'success.light' : 'action.hover' },
                     py: 1
                   }}
                 >
                   <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                     {tab.icon}
                   </ListItemIcon>
                   <ListItemText 
                     primary={t(tab.key)} 
                     slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 600 : 500 } } }} 
                   />
                 </ListItemButton>
               </ListItem>
             ))}
           </List>

        </Box>

        {/* Right Content Area */}
        <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
           
           {/* Top Header with Close Button */}
           <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, pb: 0 }}>
             <IconButton
               aria-label="Close settings"
               onClick={handleClose}
               size="small"
               sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
             >
               <CloseIcon fontSize="small" />
             </IconButton>
           </Box>

           <DialogContent sx={{ p: { xs: 3, md: 4 }, pt: { md: 1 }, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
             
             {/* GENERAL SETTINGS */}
             {activeTab === 'general' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT } }}>
                  <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>{t('general.tab')}</Typography>
                  
                  {/* Simulated MFA / Security Box like reference */}
                  <Box sx={{ mb: 4 }}>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('general.appearance')}</Typography>
                      <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={handleAppearanceChange}
                        size="small"
                        sx={{
                          '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            px: 1.4,
                            py: 0.4,
                            fontSize: '0.75rem',
                            borderColor: 'divider',
                            color: 'text.secondary',
                          },
                          '& .Mui-selected': {
                            bgcolor: 'success.light',
                            color: 'primary.main',
                            fontWeight: 600,
                          },
                        }}
                      >
                        <ToggleButton value="light">{t('general.modeLight')}</ToggleButton>
                        <ToggleButton value="dark">{t('general.modeDark')}</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('general.language')}</Typography>
                      <Select
                        size="small"
                        value={languageMode}
                        onChange={handleLanguageChange}
                        sx={{
                          minWidth: 170,
                          height: 34,
                          '& .MuiSelect-select': {
                            py: 0.6,
                            fontSize: '0.82rem',
                          },
                        }}
                      >
                        <MenuItem value="id">{t('general.languageId')}</MenuItem>
                        <MenuItem value="en">English</MenuItem>
                      </Select>
                    </Box>
                  </Box>
                </Box>
             )}

             {/* EDIT PROFIL */}
             {activeTab === 'profil' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT }, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h5" sx={{ mb: 1, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
                    {t('profile.tab')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    {t('profile.subtitle')}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 2,
                      mb: 4,
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <Avatar
                      src={userAvatar || undefined}
                      sx={{
                        width: 80,
                        height: 80,
                        backgroundColor: 'action.selected',
                        color: 'text.primary',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                      }}
                    >
                      {!userAvatar && userInitials}
                    </Avatar>
                    <Box>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={isGoogleUser}
                        sx={{ mb: 1, borderRadius: 2, color: 'text.primary', borderColor: 'divider', textTransform: 'none', fontWeight: 600 }}
                      >
                        {t('profile.changePhoto')}
                      </Button>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {isGoogleUser ? 'Nama & foto dikelola oleh Google' : t('profile.photoHint')}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('profile.fullName')}
                        defaultValue={userName}
                        variant="standard"
                        disabled={isGoogleUser}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('profile.mainCommodity')}
                        defaultValue={farmerProfile.komoditas}
                        variant="standard"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('profile.phone')}
                        placeholder={t('profile.phonePlaceholder')}
                        value={profileWhatsappPhone}
                        onChange={(event) => {
                          setProfileWhatsappPhone(event.target.value.replace(/\D/g, ''));
                          setProfileSaveSuccess(false);
                        }}
                        helperText={t('profile.phoneHelper')}
                        slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                        variant="standard"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="ID Telegram"
                        placeholder="@username atau ID"
                        value={telegramId}
                        onChange={(event) => {
                          setTelegramId(event.target.value);
                          setProfileSaveSuccess(false);
                        }}
                        helperText="Opsional untuk notifikasi"
                        variant="standard"
                      />
                    </Grid>
                  </Grid>
                  
                  <Box
                    sx={{
                      mt: 'auto',
                      pt: 3,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <Typography variant="body2" color={profileSaveSuccess ? 'success.main' : 'text.secondary'}>
                      {profileSaveSuccess ? t('profile.phoneSaved') : t('profile.phoneSaveHint')}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleSaveProfile}
                      sx={{
                        width: 160,
                        height: 44,
                        borderRadius: 3,
                        textTransform: 'none',
                        bgcolor: 'success.main',
                        '&:hover': { bgcolor: 'success.dark' },
                        color: 'common.white',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {t('profile.saveChanges')}
                    </Button>
                  </Box>
                </Box>
             )}

             {/* NOTIFIKASI */}
             {activeTab === 'notifikasi' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT } }}>
                  <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>{t('notification.tab')}</Typography>
                  
                  {[
                    { label: t('notification.items.weather.label'), desc: t('notification.items.weather.desc') },
                    { label: t('notification.items.schedule.label'), desc: t('notification.items.schedule.desc') },
                  ].map((item) => (
                    <Box key={item.label} sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box className="flex items-start justify-between gap-4">
                        <Box>
                          <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 500 }}>{item.label}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>{item.desc}</Typography>
                        </Box>
                        <Switch defaultChecked color="primary" sx={{ mt: -1 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
             )}

             {/* INFO APLIKASI */}
             {activeTab === 'info' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT } }}>
                  <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>{t('system.tab')}</Typography>
                  
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                     <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <InfoOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                     </Box>
                     <Box>
                       <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>{t('system.appName')}</Typography>
                       <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>{t('system.version')}</Typography>
                     </Box>
                  </Box>

                  {[
                    { label: t('system.backendLabel'), value: t('system.backendValue') },
                    { label: t('system.layoutLabel'), value: t('system.layoutValue') },
                  ].map((item) => (
                    <Box key={item.label} className="flex justify-between items-center py-3 border-b border-gray-100">
                      <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
             )}

           </DialogContent>
        </Box>
      </Box>
    </Dialog>
  );
}
