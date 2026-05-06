'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
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

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

const SETTINGS_TABS = [
  { id: 'profil', key: 'profile.tab', icon: <PersonOutlineIcon /> },
  { id: 'general', key: 'general.tab', icon: <TuneIcon /> },
  { id: 'notifikasi', key: 'notification.tab', icon: <NotificationsNoneIcon /> },
  { id: 'info', key: 'system.tab', icon: <InfoOutlinedIcon /> },
];

const TAB_CONTENT_MIN_HEIGHT = 460;
type AppearanceMode = 'light' | 'dark' | 'system';
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
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = user?.user_metadata?.avatar_url;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>('system');
  const [languageMode, setLanguageMode] = useState<LanguageMode>(locale as LanguageMode);
  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [profileWhatsappPhone, setProfileWhatsappPhone] = useState(weatherWhatsappPhone);
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);

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

  const handleAppearanceChange = (_: MouseEvent<HTMLElement>, nextMode: AppearanceMode | null) => {
    if (nextMode) {
      setAppearanceMode(nextMode);
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
    setPhoneSaveSuccess(true);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth 
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, md: 4 },
            overflow: 'hidden',
            width: '100%',
            height: { xs: '100%', md: '650px' },
            minHeight: { xs: '100%', md: '650px' },
            maxHeight: { xs: '100%', md: '650px' },
            m: { xs: 0, md: 2 },
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

           <DialogContent sx={{ p: { xs: 3, md: 5 }, pt: { md: 2 }, overflowY: 'scroll', display: 'flex', flexDirection: 'column' }}>
             
             {/* GENERAL SETTINGS */}
             {activeTab === 'general' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT } }}>
                  <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>{t('general.tab')}</Typography>
                  
                  {/* Simulated MFA / Security Box like reference */}
                  <Box sx={{ mb: 4 }}>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('general.appearance')}</Typography>
                      <ToggleButtonGroup
                        value={appearanceMode}
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
                        <ToggleButton value="system">{t('general.modeSystem')}</ToggleButton>
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
                        sx={{ mb: 1, borderRadius: 2, color: 'text.primary', borderColor: 'divider', textTransform: 'none', fontWeight: 600 }}
                      >
                        {t('profile.changePhoto')}
                      </Button>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {t('profile.photoHint')}
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
                          setPhoneSaveSuccess(false);
                        }}
                        helperText={t('profile.phoneHelper')}
                        slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
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
                    <Typography variant="body2" color={phoneSaveSuccess ? 'success.main' : 'text.secondary'}>
                      {phoneSaveSuccess ? t('profile.phoneSaved') : t('profile.phoneSaveHint')}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleSaveProfile}
                      sx={{
                        width: 210,
                        height: 56,
                        borderRadius: 6,
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
                    { label: t('notification.items.tips.label'), desc: t('notification.items.tips.desc') },
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
                     <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
