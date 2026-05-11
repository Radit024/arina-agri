'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';

import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useThemeMode } from '@/context/ThemeContext';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

export default function PengaturanPage() {
  const t = useTranslations('Settings');
  
  // Start with null. On mobile this shows the menu list. On desktop it defaults to 'general' visually.
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { mode, setThemeMode } = useThemeMode();

  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || farmerProfile.nama;
  const userInitials = userName.substring(0, 2).toUpperCase();
  const userAvatar = user?.user_metadata?.avatar_url;
  const weatherPhoneKey = `${WEATHER_WHATSAPP_PHONE_KEY}-${user?.id || 'guest'}`;
  const [weatherWhatsappPhone, setWeatherWhatsappPhone] = useLocalStorage<string>(weatherPhoneKey, '');
  const [profileWhatsappPhone, setProfileWhatsappPhone] = useState(weatherWhatsappPhone);
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);

  useEffect(() => {
    setProfileWhatsappPhone(weatherWhatsappPhone);
  }, [weatherWhatsappPhone]);

  const handleSaveProfile = () => {
    setWeatherWhatsappPhone(profileWhatsappPhone.trim());
    setPhoneSaveSuccess(true);
  };

  const SETTINGS_TABS = [
    { id: 'general', label: t('general.tab'), icon: <TuneIcon /> },
    { id: 'profil', label: t('profile.tab'), icon: <PersonOutlineIcon /> },
    { id: 'notifikasi', label: t('notification.tab'), icon: <NotificationsNoneIcon /> },
    { id: 'info', label: t('system.tab'), icon: <InfoOutlinedIcon /> },
  ];

  // The active tab for content rendering (fall back to 'general' if null on desktop)
  const currentContentTab = activeTab || 'general';

  const renderContent = () => {
    return (
      <Box sx={{ width: '100%', animation: 'fadeIn 0.3s ease-in-out' }}>
        {/* GENERAL SETTINGS */}
        {currentContentTab === 'general' && (
           <Box>
             <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700, display: { xs: 'none', md: 'block' } }}>{t('general.tab')}</Typography>
             
             {/* Security Box */}
             <Box sx={{ bgcolor: '#111827', color: 'white', p: { xs: 2.5, md: 3 }, borderRadius: 3, mb: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{t('general.securityBox.title')}</Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                  {t('general.securityBox.desc')}
                </Typography>
                <Button variant="contained" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}>
                  {t('general.securityBox.button')}
                </Button>
             </Box>

              <Box sx={{ mb: 4 }}>
                <Box sx={{ py: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{t('general.appearance')}</Typography>
                    <Typography variant="body2" color="text.secondary">Pilih tema tampilan aplikasi yang nyaman untuk mata Anda.</Typography>
                  </Box>
                  <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, newMode) => newMode && setThemeMode(newMode)}
                    size="small"
                    sx={{
                      bgcolor: 'action.hover',
                      width: { xs: '100%', sm: 'auto' },
                      display: 'flex',
                      '& .MuiToggleButton-root': {
                        flex: { xs: 1, sm: 'initial' },
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        border: 'none',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: 'text.secondary',
                        '&.Mui-selected': {
                          bgcolor: 'background.paper',
                          color: 'primary.main',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          '&:hover': { bgcolor: 'background.paper' }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="light">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <LightModeIcon sx={{ fontSize: 18 }} />
                        {t('general.modeLight')}
                      </Box>
                    </ToggleButton>
                    <ToggleButton value="dark">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <DarkModeIcon sx={{ fontSize: 18 }} />
                        {t('general.modeDark')}
                      </Box>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

               <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                 <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('general.language')}</Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }}>{t('general.languageName')}</Typography>
               </Box>
             </Box>
           </Box>
        )}

        {/* EDIT PROFIL */}
        {currentContentTab === 'profil' && (
           <Box>
             <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700, display: { xs: 'none', md: 'block' } }}>{t('profile.tab')}</Typography>
             
             <Box className="flex items-center gap-4 mb-6">
               <Avatar
                 src={userAvatar || undefined}
                 sx={{
                   width: { xs: 64, md: 80 },
                   height: { xs: 64, md: 80 },
                   backgroundColor: '#f0fdf4',
                   color: '#16a34a',
                   fontSize: { xs: '1.25rem', md: '1.5rem' },
                   fontWeight: 700,
                 }}
               >
                 {!userAvatar && userInitials}
               </Avatar>
               <Box>
                 <Button variant="outlined" size="small" sx={{ mb: 1, borderRadius: 2 }}>{t('profile.changePhoto')}</Button>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('profile.photoHint')}</Typography>
               </Box>
             </Box>
             
             <Grid container spacing={4}>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.fullName')} defaultValue={userName} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.location')} defaultValue={farmerProfile.lokasi} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.mainCommodity')} defaultValue={farmerProfile.komoditas} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.landArea')} defaultValue={farmerProfile.luasLahan} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField
                   fullWidth
                   label={t('profile.phone')}
                   placeholder={t('profile.phonePlaceholder')}
                   value={profileWhatsappPhone}
                   onChange={(e) => {
                     setProfileWhatsappPhone(e.target.value.replace(/\D/g, ''));
                     setPhoneSaveSuccess(false);
                   }}
                   helperText={t('profile.phoneHelper')}
                   slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                   variant="standard"
                 />
               </Grid>
             </Grid>
             
             <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
               <Typography variant="body2" color={phoneSaveSuccess ? 'success.main' : 'text.secondary'} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                 {phoneSaveSuccess ? t('profile.phoneSaved') : t('profile.phoneSaveHint')}
               </Typography>
               <Button variant="contained" sx={{ px: 4, py: { xs: 1.5, sm: 1 }, borderRadius: 2, bgcolor: '#16a34a', '&:hover': { bgcolor: 'primary.dark' }, width: { xs: '100%', sm: 'auto' } }} onClick={handleSaveProfile}>
                 {t('profile.saveChanges')}
               </Button>
             </Box>
           </Box>
        )}

        {/* NOTIFIKASI */}
        {currentContentTab === 'notifikasi' && (
           <Box>
             <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700, display: { xs: 'none', md: 'block' } }}>{t('notification.title')}</Typography>
             
             {[
               { label: t('notification.items.weather.label'), desc: t('notification.items.weather.desc') },
               { label: t('notification.items.schedule.label'), desc: t('notification.items.schedule.desc') },
               { label: t('notification.items.finance.label'), desc: t('notification.items.finance.desc') },
               { label: t('notification.items.tips.label'), desc: t('notification.items.tips.desc') },
             ].map((item) => (
               <Box key={item.label} sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                 <Box className="flex items-start justify-between gap-4">
                   <Box>
                     <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 600 }}>{item.label}</Typography>
                     <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>{item.desc}</Typography>
                   </Box>
                   <Switch defaultChecked color="primary" sx={{ mt: -1 }} />
                 </Box>
               </Box>
             ))}
           </Box>
        )}

        {/* INFO APLIKASI */}
        {currentContentTab === 'info' && (
           <Box>
             <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700, display: { xs: 'none', md: 'block' } }}>{t('system.title')}</Typography>
             
             <Box sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
                <Box sx={{ width: { xs: 48, md: 60 }, height: { xs: 48, md: 60 }, borderRadius: 3, bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <InfoOutlinedIcon sx={{ fontSize: { xs: 24, md: 32 }, color: '#16a34a' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ color: 'primary.dark', fontWeight: 700, fontSize: { xs: '1rem', md: '1.25rem' } }}>{t('system.appName')}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>{t('system.version')}</Typography>
                </Box>
             </Box>

             {[
               { label: t('system.items.backend'), value: t('system.values.backend') },
               { label: t('system.items.frontend'), value: t('system.values.frontend') },
               { label: t('system.items.design'), value: t('system.values.design') },
               { label: t('system.items.ai'), value: t('system.values.ai') },
             ].map((item) => (
               <Box key={item.label} className="flex justify-between items-center py-3 border-b border-gray-100">
                 <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                 <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', ml: 2 }}>{item.value}</Typography>
               </Box>
             ))}
           </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <Box sx={{ display: { xs: activeTab !== null ? 'flex' : 'block', md: 'block' }, alignItems: 'center', mb: 3, gap: 1 }}>
        {/* On Mobile when tab is selected, show back button */}
        <IconButton 
          onClick={() => setActiveTab(null)} 
          sx={{ display: { xs: activeTab !== null ? 'inline-flex' : 'none', md: 'none' }, ml: -1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        {/* On Mobile when tab is selected, show the specific tab title instead of 'Pengaturan' */}
        {activeTab !== null ? (
           <Typography variant="h6" sx={{ display: { xs: 'block', md: 'none' }, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
             {SETTINGS_TABS.find(t => t.id === activeTab)?.label}
           </Typography>
        ) : null}

        {/* Standard Page Title (Hidden on mobile if a tab is open) */}
        <Box sx={{ display: { xs: activeTab === null ? 'block' : 'none', md: 'block' } }}>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{t('pageSubtitle')}</Typography>
        </Box>
      </Box>

      {/* Main Container */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flex: 1, gap: { xs: 0, md: 3 } }}>
        
        {/* Navigation Sidebar / Mobile Menu */}
        <Box
          sx={{ 
            display: { xs: activeTab === null ? 'block' : 'none', md: 'block' },
            width: { xs: '100%', md: 280 }, 
            flexShrink: 0,
          }}
        >
          <Card 
            elevation={0}
            sx={{ 
              bgcolor: { xs: 'transparent', md: '#f8fafc' }, 
              border: { xs: 'none', md: '1px solid' }, 
              borderColor: 'divider', 
              borderRadius: { xs: 0, md: 4 },
              p: { xs: 0, md: 2 },
              height: 'fit-content'
            }}
          >
            <Typography variant="caption" sx={{ px: 2, mb: 1, display: { xs: 'none', md: 'block' }, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
              {t('menuLabel')}
            </Typography>

            {/* Mobile Native-like Menu List */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
              {SETTINGS_TABS.map((tab) => (
                <Card
                  key={tab.id}
                  elevation={0}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:active': { transform: 'scale(0.98)' },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tab.icon}
                    </Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{tab.label}</Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                </Card>
              ))}
            </Box>

            {/* Desktop Menu List */}
            <List disablePadding sx={{ display: { xs: 'none', md: 'block' } }}>
              {SETTINGS_TABS.map((tab) => {
                const isActive = activeTab === tab.id || (activeTab === null && tab.id === 'general');
                return (
                  <ListItem key={tab.id} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => setActiveTab(tab.id)}
                      sx={{
                        borderRadius: 2,
                        bgcolor: isActive ? '#f0fdf4' : 'transparent',
                        color: isActive ? '#16a34a' : 'text.primary',
                        '&:hover': { bgcolor: isActive ? '#f0fdf4' : '#f8fafc' },
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#16a34a' : '#64748b' }}>
                        {tab.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={tab.label} 
                        slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: isActive ? 600 : 500 } } }} 
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Card>
        </Box>

        {/* Content Area */}
        <Box
          sx={{
            display: { xs: activeTab !== null ? 'block' : 'none', md: 'block' },
            flex: 1,
            width: '100%'
          }}
        >
          <Card 
            elevation={0}
            sx={{ 
              p: { xs: 2, md: 4 }, 
              bgcolor: '#ffffff', 
              borderRadius: { xs: 3, md: 4 },
              border: { xs: 'none', md: '1px solid' },
              borderColor: 'divider',
              minHeight: { xs: 'auto', md: 'calc(100vh - 200px)' },
              boxShadow: { xs: '0 4px 20px rgba(0,0,0,0.03)', md: 'none' }
            }}
          >
             {renderContent()}
          </Card>
        </Box>
        
      </Box>
    </Box>
  );
}
