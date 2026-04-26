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

import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';

import { farmerProfile } from '@/lib/mockData';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

const WEATHER_WHATSAPP_PHONE_KEY = 'arina-weather-whatsapp-phone';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: <TuneIcon /> },
  { id: 'profil', label: 'Edit Profil', icon: <PersonOutlineIcon /> },
  { id: 'notifikasi', label: 'Notifikasi', icon: <NotificationsNoneIcon /> },
  { id: 'info', label: 'Informasi Sistem', icon: <InfoOutlinedIcon /> },
];

export default function PengaturanPage() {
  const t = useTranslations('Settings');
  const [activeTab, setActiveTab] = useState('general');

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

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">{t('pageSubtitle')}</Typography>
      </Box>

      {/* Main Settings Card Layout */}
      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 'calc(100vh - 180px)', flex: 1, borderRadius: 4, overflow: 'hidden' }}>
        
        {/* Left Navigation (Inner Sidebar) */}
        <Box sx={{ width: { xs: '100%', md: 280 }, bgcolor: '#f8fafc', borderRight: '1px solid', borderColor: 'divider', p: 2 }}>
           <Typography variant="caption" sx={{ px: 2, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
             {t('menuLabel')}
           </Typography>
           <List disablePadding>
             {SETTINGS_TABS.map((tab) => (
               <ListItem key={tab.id} disablePadding sx={{ mb: 0.5 }}>
                 <ListItemButton
                   onClick={() => setActiveTab(tab.id)}
                   sx={{
                     borderRadius: 2,
                     bgcolor: activeTab === tab.id ? '#f0fdf4' : 'transparent',
                     color: activeTab === tab.id ? '#16a34a' : 'text.primary',
                     '&:hover': { bgcolor: activeTab === tab.id ? '#f0fdf4' : '#f8fafc' }
                   }}
                 >
                   <ListItemIcon sx={{ minWidth: 40, color: activeTab === tab.id ? '#16a34a' : '#64748b' }}>
                     {tab.icon}
                   </ListItemIcon>
                   <ListItemText 
                     primary={tab.id === 'general' ? t('general.tab') : tab.id === 'profil' ? t('profile.tab') : tab.id === 'notifikasi' ? t('notification.tab') : t('system.tab')} 
                     slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 600 : 500 } } }} 
                   />
                 </ListItemButton>
               </ListItem>
             ))}
           </List>
        </Box>

        {/* Right Content Area */}
        <Box sx={{ flex: 1, p: { xs: 3, md: 6 }, bgcolor: '#ffffff', overflowY: 'auto' }}>
           
           {/* GENERAL SETTINGS */}
           {activeTab === 'general' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>General</Typography>
                
                {/* Simulated MFA / Security Box like reference */}
                <Box sx={{ bgcolor: '#111827', color: 'white', p: 3, borderRadius: 3, mb: 5 }}>
                   <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>🔒 Amankan Akun Anda</Typography>
                   <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                     Tambahkan autentikasi multi-faktor (MFA) seperti passkey atau kode SMS untuk melindungi akun Anda saat fitur backend diaktifkan.
                   </Typography>
                   <Button variant="contained" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2 }}>
                     Set up MFA (Segera)
                   </Button>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Appearance (Tema)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: '#16a34a' } }}>System</Typography>
                  </Box>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Contrast</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: '#16a34a' } }}>System</Typography>
                  </Box>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Accent Color</Typography>
                    <Box className="flex items-center gap-1.5 cursor-pointer">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#16a34a' }} />
                      <Typography variant="body2" color="#16a34a" sx={{ fontWeight: 600 }}>Arina Green</Typography>
                    </Box>
                  </Box>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Language</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }}>Bahasa Indonesia</Typography>
                  </Box>
                </Box>
              </Box>
           )}

           {/* EDIT PROFIL */}
           {activeTab === 'profil' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>Edit Profil</Typography>
                
                <Box className="flex items-center gap-4 mb-6">
                  <Avatar
                    src={userAvatar || undefined}
                    sx={{
                      width: 80,
                      height: 80,
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {!userAvatar && userInitials}
                  </Avatar>
                  <Box>
                    <Button variant="outlined" size="small" sx={{ mb: 1, borderRadius: 2 }}>Ganti Foto</Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Format JPG, PNG, atau GIF. Ukuran maks 2MB.</Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Nama Lengkap" defaultValue={userName} variant="standard" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Lokasi / Desa" defaultValue={farmerProfile.lokasi} variant="standard" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Komoditas Utama" defaultValue={farmerProfile.komoditas} variant="standard" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Luas Lahan" defaultValue={farmerProfile.luasLahan} variant="standard" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Nomor WhatsApp Notifikasi Cuaca"
                      placeholder="Contoh: 08123456789"
                      value={profileWhatsappPhone}
                      onChange={(e) => {
                        setProfileWhatsappPhone(e.target.value.replace(/\D/g, ''));
                        setPhoneSaveSuccess(false);
                      }}
                      helperText="Nomor ini dipakai untuk notifikasi cuaca di halaman Cuaca"
                      slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                      variant="standard"
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color={phoneSaveSuccess ? 'success.main' : 'text.secondary'}>
                    {phoneSaveSuccess ? 'Nomor WhatsApp berhasil diperbarui.' : 'Simpan untuk menerapkan nomor notifikasi cuaca yang baru.'}
                  </Typography>
                  <Button variant="contained" sx={{ px: 4, borderRadius: 2, bgcolor: '#16a34a', '&:hover': { bgcolor: 'primary.dark' } }} onClick={handleSaveProfile}>
                    Simpan Perubahan
                  </Button>
                </Box>
              </Box>
           )}

           {/* NOTIFIKASI */}
           {activeTab === 'notifikasi' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>Pengaturan Notifikasi</Typography>
                
                {[
                  { label: 'Notifikasi Cuaca Ekstrem', desc: 'Terima peringatan cuaca via WhatsApp jika ada mendung lebat / badai.' },
                  { label: 'Pengingat Jadwal Kegiatan', desc: 'Notifikasi H-1 sebelum jadwal pertanian (pemupukan, panen, dsb).' },
                  { label: 'Laporan Keuangan Mingguan', desc: 'Ringkasan otomatis laba rugi mingguan setiap hari Senin.' },
                  { label: 'Tips Budidaya dari AI Arina', desc: 'Saran mingguan berdasarkan kondisi lahan dan fase tanaman Anda.' },
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
           {activeTab === 'info' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 4, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>Informasi Sistem</Typography>
                
                <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                   <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <InfoOutlinedIcon sx={{ fontSize: 32, color: '#16a34a' }} />
                   </Box>
                   <Box>
                     <Typography variant="h6" sx={{ color: 'primary.dark', fontWeight: 700 }}>Arina Web Platform</Typography>
                     <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>Versi 1.0.0 (Beta) · Local Storage Environment</Typography>
                   </Box>
                </Box>

                {[
                  { label: 'Platform Backend', value: 'Offline (Browser LocalStorage)' },
                  { label: 'Arsitektur Frontend', value: 'Next.js 16 + React 19' },
                  { label: 'Design System', value: 'Material UI v6' },
                  { label: 'Model AI (Simulasi)', value: 'Agricultural Dataset ID' },
                ].map((item) => (
                  <Box key={item.label} className="flex justify-between items-center py-3 border-b border-gray-100">
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
           )}

        </Box>
      </Card>
    </Box>
  );
}
