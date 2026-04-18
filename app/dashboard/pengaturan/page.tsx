'use client';

import { useState } from 'react';
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

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: <TuneIcon /> },
  { id: 'profil', label: 'Edit Profil', icon: <PersonOutlineIcon /> },
  { id: 'notifikasi', label: 'Notifikasi', icon: <NotificationsNoneIcon /> },
  { id: 'info', label: 'Informasi Sistem', icon: <InfoOutlinedIcon /> },
];

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
          Pengaturan
        </Typography>
        <Typography variant="body2" color="text.secondary">Personalisasi tampilan, profil, dan opsi akun Anda</Typography>
      </Box>

      {/* Main Settings Card Layout */}
      <Card sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 'calc(100vh - 180px)', flex: 1, borderRadius: 4, overflow: 'hidden' }}>
        
        {/* Left Navigation (Inner Sidebar) */}
        <Box sx={{ width: { xs: '100%', md: 280 }, bgcolor: '#f8fafc', borderRight: '1px solid', borderColor: 'divider', p: 2 }}>
           <Typography variant="caption" fontWeight={700} sx={{ px: 2, mb: 1, display: 'block', color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
             Menu Pengaturan
           </Typography>
           <List disablePadding>
             {SETTINGS_TABS.map((tab) => (
               <ListItem key={tab.id} disablePadding sx={{ mb: 0.5 }}>
                 <ListItemButton
                   onClick={() => setActiveTab(tab.id)}
                   sx={{
                     borderRadius: 2,
                     bgcolor: activeTab === tab.id ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                     color: activeTab === tab.id ? 'primary.main' : 'text.primary',
                     '&:hover': { bgcolor: activeTab === tab.id ? 'rgba(22, 163, 74, 0.12)' : 'rgba(0,0,0,0.04)' }
                   }}
                 >
                   <ListItemIcon sx={{ minWidth: 40, color: activeTab === tab.id ? 'primary.main' : '#64748b' }}>
                     {tab.icon}
                   </ListItemIcon>
                   <ListItemText 
                     primary={tab.label} 
                     slotProps={{ primary: { fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 600 : 500 } }} 
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
                <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>General</Typography>
                
                {/* Simulated MFA / Security Box like reference */}
                <Box sx={{ bgcolor: '#111827', color: 'white', p: 3, borderRadius: 3, mb: 5 }}>
                   <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>🔒 Amankan Akun Anda</Typography>
                   <Typography variant="body2" sx={{ color: '#9ca3af', mb: 3 }}>
                     Tambahkan autentikasi multi-faktor (MFA) seperti passkey atau kode SMS untuk melindungi akun Anda saat fitur backend diaktifkan.
                   </Typography>
                   <Button variant="contained" sx={{ bgcolor: 'white', color: 'black', '&:hover': { bgcolor: '#e5e7eb' }, borderRadius: 2 }}>
                     Set up MFA (Segera)
                   </Button>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={500}>Appearance (Tema)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>System</Typography>
                  </Box>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={500}>Contrast</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>System</Typography>
                  </Box>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={500}>Accent Color</Typography>
                    <Box className="flex items-center gap-1.5 cursor-pointer">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
                      <Typography variant="body2" color="primary.main" fontWeight={600}>Arina Green</Typography>
                    </Box>
                  </Box>
                  <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={500}>Language</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }}>Bahasa Indonesia</Typography>
                  </Box>
                </Box>
              </Box>
           )}

           {/* EDIT PROFIL */}
           {activeTab === 'profil' && (
              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>Edit Profil</Typography>
                
                <Box className="flex items-center gap-4 mb-6">
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      backgroundColor: 'primary.light',
                      color: 'primary.main',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                    }}
                  >
                    BS
                  </Avatar>
                  <Box>
                    <Button variant="outlined" size="small" sx={{ mb: 1, borderRadius: 2 }}>Ganti Foto</Button>
                    <Typography variant="caption" display="block" color="text.secondary">Format JPG, PNG, atau GIF. Ukuran maks 2MB.</Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Nama Lengkap" defaultValue={farmerProfile.nama} variant="standard" />
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
                </Grid>
                
                <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" sx={{ px: 4, borderRadius: 2 }}>Simpan Perubahan</Button>
                </Box>
              </Box>
           )}

           {/* NOTIFIKASI */}
           {activeTab === 'notifikasi' && (
              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>Pengaturan Notifikasi</Typography>
                
                {[
                  { label: 'Notifikasi Cuaca Ekstrem', desc: 'Terima peringatan cuaca via WhatsApp jika ada mendung lebat / badai.' },
                  { label: 'Pengingat Jadwal Kegiatan', desc: 'Notifikasi H-1 sebelum jadwal pertanian (pemupukan, panen, dsb).' },
                  { label: 'Laporan Keuangan Mingguan', desc: 'Ringkasan otomatis laba rugi mingguan setiap hari Senin.' },
                  { label: 'Tips Budidaya dari AI Arina', desc: 'Saran mingguan berdasarkan kondisi lahan dan fase tanaman Anda.' },
                ].map((item) => (
                  <Box key={item.label} sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box className="flex items-start justify-between gap-4">
                      <Box>
                        <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>{item.label}</Typography>
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
                <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>Informasi Sistem</Typography>
                
                <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                   <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <InfoOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                   </Box>
                   <Box>
                     <Typography variant="h6" fontWeight={700} sx={{ color: 'primary.dark' }}>Arina Web Platform</Typography>
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
                    <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
           )}

        </Box>
      </Card>
    </Box>
  );
}
