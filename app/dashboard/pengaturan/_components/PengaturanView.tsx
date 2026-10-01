'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';

import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useTranslations } from 'next-intl';
import { PageActionButton, PageHeader, PageShell } from '@/components/shared/page';
import type { SettingsTabId } from '@/controllers/pengaturan/usePengaturanController';

interface PengaturanViewProps {
  activeTab: SettingsTabId | null;
  currentContentTab: SettingsTabId;
  mode: 'light' | 'dark';
  phoneSaveSuccess: boolean;
  profileSaveError: string;
  profileSaving: boolean;
  profileWhatsappPhone: string;
  profileTelegramUsername: string;
  profileFullName: string;
  profileLokasi: string;
  profileKomoditas: string;
  profileLuasLahan: string;
  userAvatar?: string;
  userInitials: string;
  onBackToMenu: () => void;
  onProfileWhatsappPhoneChange: (value: string) => void;
  onProfileTelegramUsernameChange: (value: string) => void;
  onProfileFullNameChange: (value: string) => void;
  onProfileLokasiChange: (value: string) => void;
  onProfileKomoditasChange: (value: string) => void;
  onProfileLuasLahanChange: (value: string) => void;
  onSaveProfile: () => void;
  onTabChange: (tab: SettingsTabId) => void;
  onThemeModeChange: (mode: 'light' | 'dark') => void;
}

export default function PengaturanView({
  activeTab,
  currentContentTab,
  mode,
  phoneSaveSuccess,
  profileSaveError,
  profileSaving,
  profileTelegramUsername,
  profileFullName,
  profileLokasi,
  profileKomoditas,
  profileLuasLahan,
  userAvatar,
  userInitials,
  onBackToMenu,
  onProfileTelegramUsernameChange,
  onProfileFullNameChange,
  onProfileLokasiChange,
  onProfileKomoditasChange,
  onProfileLuasLahanChange,
  onSaveProfile,
  onTabChange,
  onThemeModeChange,
}: PengaturanViewProps) {
  const t = useTranslations('Settings');
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const SETTINGS_TABS = [
    { id: 'general' as const, label: t('general.tab'), icon: <TuneIcon /> },
    { id: 'profil' as const, label: t('profile.tab'), icon: <PersonOutlineIcon /> },
    { id: 'notifikasi' as const, label: t('notification.tab'), icon: <NotificationsNoneIcon /> },
    { id: 'info' as const, label: t('system.tab'), icon: <InfoOutlinedIcon /> },
  ];

  const selectedToggleShadow =
    theme.palette.mode === 'dark' ? '0 2px 10px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.08)';

  const renderContent = () => {
    return (
      <Box sx={{ width: '100%', animation: 'fadeIn 0.3s ease-in-out' }}>
        {/* GENERAL SETTINGS */}
        {currentContentTab === 'general' && (
           <Box>
             <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700, display: { xs: 'none', md: 'block' } }}>{t('general.tab')}</Typography>
             
             {/* Security Box */}
             <Box
               sx={{
                 bgcolor: 'background.paper',
                 color: 'text.primary',
                 p: { xs: 2.5, md: 3 },
                 borderRadius: 3,
                 border: '1px solid',
                 borderColor: 'divider',
                 mb: 4,
               }}
             >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{t('general.securityBox.title')}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  {t('general.securityBox.desc')}
                </Typography>
                <PageActionButton variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  {t('general.securityBox.button')}
                </PageActionButton>
             </Box>

              <Box sx={{ mb: 4 }}>
                <Box sx={{ py: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{t('general.appearance')}</Typography>
                    <Typography variant="body2" color="text.secondary">Pilih tema tampilan aplikasi yang nyaman untuk mata Anda.</Typography>
                  </Box>
                  <ToggleButtonGroup
                    data-guide-target="settings-theme-toggle"
                    value={mode}
                    exclusive
                    onChange={(_, newMode) => newMode && onThemeModeChange(newMode)}
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
                          boxShadow: selectedToggleShadow,
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

               <Box sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
             
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar
                  src={userAvatar || undefined}
                  sx={{
                    width: { xs: 64, md: 80 },
                    height: { xs: 64, md: 80 },
                    backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                    color: 'success.main',
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                    fontWeight: 700,
                  }}
                >
                 {!userAvatar && userInitials}
               </Avatar>
               <Box>
                 <PageActionButton variant="outlined" size="small" sx={{ mb: 1 }}>{t('profile.changePhoto')}</PageActionButton>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('profile.photoHint')}</Typography>
               </Box>
             </Box>
             
             <Grid container spacing={4}>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.fullName')} value={profileFullName} onChange={(e) => onProfileFullNameChange(e.target.value)} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.location')} value={profileLokasi} onChange={(e) => onProfileLokasiChange(e.target.value)} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.mainCommodity')} value={profileKomoditas} onChange={(e) => onProfileKomoditasChange(e.target.value)} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField fullWidth label={t('profile.landArea')} value={profileLuasLahan} onChange={(e) => onProfileLuasLahanChange(e.target.value)} variant="standard" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <Box sx={{ position: 'relative' }}>
                   <TextField
                     fullWidth
                     label={t('profile.phone')}
                     placeholder={t('profile.phonePlaceholder')}
                     value=""
                     disabled
                     helperText="Bot saat ini menggunakan Telegram. WhatsApp segera hadir."
                     slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                     variant="standard"
                   />
                 </Box>
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                 <TextField
                   fullWidth
                   label="ID / Username Telegram"
                   placeholder="123456789 atau @username"
                   value={profileTelegramUsername}
                   onChange={(e) => onProfileTelegramUsernameChange(e.target.value)}
                   helperText="Masukkan chat ID numeric atau username Telegram. Tekan START pada bot Arina Agri agar bot dapat mengenali akun Anda."
                   variant="standard"
                 />
               </Grid>
             </Grid>
             
             <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
               <Typography variant="body2" color={profileSaveError ? 'error.main' : phoneSaveSuccess ? 'success.main' : 'text.secondary'} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                 {profileSaveError || (phoneSaveSuccess ? t('profile.phoneSaved') : t('profile.phoneSaveHint'))}
               </Typography>
                <PageActionButton
                  data-guide-target="settings-profile-save"
                  variant="contained"
                  disabled={profileSaving}
                  color="success"
                  sx={{ px: 4, py: { xs: 1.5, sm: 1 }, width: { xs: '100%', sm: 'auto' } }}
                  onClick={onSaveProfile}
                >
                  {profileSaving ? 'Menyimpan...' : t('profile.saveChanges')}
                </PageActionButton>
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
                 <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
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
                <Box
                  sx={{
                    width: { xs: 48, md: 60 },
                    height: { xs: 48, md: 60 },
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: { xs: 24, md: 32 }, color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, fontSize: { xs: '1rem', md: '1.25rem' } }}>{t('system.appName')}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>{t('system.version')}</Typography>
                </Box>
             </Box>

             {[
               { label: t('system.items.backend'), value: t('system.values.backend') },
               { label: t('system.items.frontend'), value: t('system.values.frontend') },
               { label: t('system.items.design'), value: t('system.values.design') },
               { label: t('system.items.ai'), value: t('system.values.ai') },
             ].map((item) => (
               <Box
                 key={item.label}
                 sx={{
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   py: 3,
                   borderBottom: '1px solid',
                   borderColor: 'divider',
                 }}
               >
                 <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                 <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', ml: 2 }}>{item.value}</Typography>
               </Box>
             ))}
           </Box>
        )}
      </Box>
    );
  };

  // Shared inner content (used by both mobile sheet and desktop page)
  const innerContent = (
    <PageShell sx={{ height: '100%' }}>
      
      {/* Header */}
      <Box sx={{ display: { xs: activeTab !== null ? 'flex' : 'block', md: 'block' }, alignItems: 'center', mb: 3, gap: 1 }}>
        {/* On Mobile when tab is selected, show back button */}
        <IconButton
          aria-label={t('backToMenu')}
          onClick={onBackToMenu}
          sx={{ display: { xs: activeTab !== null ? 'inline-flex' : 'none', md: 'none' }, ml: -1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        {/* On Mobile when tab is selected, show the specific tab title instead of 'Pengaturan' */}
        {activeTab !== null ? (
           <Typography variant="h6" sx={{ display: { xs: 'block', md: 'none' }, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
             {SETTINGS_TABS.find((tab) => tab.id === activeTab)?.label}
           </Typography>
        ) : null}

        {/* Standard Page Title (Hidden on mobile if a tab is open) */}
        <Box sx={{ display: { xs: activeTab === null ? 'block' : 'none', md: 'block' }, flex: 1 }}>
          <PageHeader title={t('title')} subtitle={t('pageSubtitle')} sx={{ mb: 0 }} />
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
              data-guide-target="settings-tabs"
              elevation={0}
              sx={{ 
               bgcolor: { xs: 'transparent', md: 'background.default' }, 
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
                  data-guide-target={`settings-tab-${tab.id}`}
                  key={tab.id}
                  elevation={0}
                  onClick={() => onTabChange(tab.id)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:active': { transform: 'scale(0.98)' },
                    boxShadow: theme.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                        color: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
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
                      data-guide-target={`settings-tab-${tab.id}`}
                      onClick={() => onTabChange(tab.id)}
                      sx={{
                        borderRadius: 2,
                        bgcolor: isActive ? 'success.light' : 'transparent',
                        color: isActive ? 'success.main' : 'text.primary',
                        '&:hover': { bgcolor: isActive ? 'success.light' : 'action.hover' },
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'success.main' : 'text.secondary' }}>
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
              bgcolor: 'background.paper', 
              borderRadius: { xs: 3, md: 4 },
              border: { xs: 'none', md: '1px solid' },
              borderColor: 'divider',
              minHeight: { xs: 'auto', md: 'calc(100vh - 200px)' },
              boxShadow: { xs: theme.palette.mode === 'dark' ? '0 4px 18px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.03)', md: 'none' }
            }}
          >
             {renderContent()}
          </Card>
        </Box>
        
      </Box>
    </PageShell>
  );

  // Mobile: Bottom sheet (SwipeableDrawer)
  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={true}
        onClose={() => router.back()}
        onOpen={() => {}}
        disableSwipeToOpen
        swipeAreaWidth={0}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px 20px 0 0',
              maxHeight: '60vh',
              minHeight: '45vh',
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

        {/* Scrollable Sheet Body */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {innerContent}
        </Box>

        {/* Safe area bottom */}
        <Box sx={{ pb: 'env(safe-area-inset-bottom)', flexShrink: 0 }} />
      </SwipeableDrawer>
    );
  }

  // Desktop: Full page layout
  return innerContent;
}
