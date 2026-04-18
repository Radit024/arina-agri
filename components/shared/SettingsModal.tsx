'use client';

import { useState, useEffect } from 'react';
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

import CloseIcon from '@mui/icons-material/Close';
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

const TAB_CONTENT_MIN_HEIGHT = 460;

export default function SettingsModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const isOpen = searchParams.get('settings') === 'true';
  const initialTab = searchParams.get('tab') || 'general';
  
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(searchParams.get('tab') || 'general');
    }
  }, [isOpen, searchParams]);

  const handleClose = () => {
    // Reset back to exactly the current pathname without the query Param
    router.push(pathname, { scroll: false });
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth 
      PaperProps={{
        sx: { 
          borderRadius: { xs: 0, md: 4 }, 
          overflow: 'hidden', 
          width: '100%',
          height: { xs: '100%', md: '650px' }, 
          minHeight: { xs: '100%', md: '650px' }, 
          maxHeight: { xs: '100%', md: '650px' },
          m: { xs: 0, md: 2 } 
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '100%', flex: 1 }}>
        
        {/* Left Navigation (Inner Sidebar) */}
        <Box sx={{ width: { xs: '100%', md: 240 }, bgcolor: '#f8fafc', borderRight: '1px solid', borderColor: 'divider', p: 2, display: 'flex', flexDirection: 'column' }}>
           <Typography variant="body2" fontWeight={700} sx={{ px: 2, mb: 2, mt: 1, display: 'block', color: 'text.primary', fontSize: '1rem', fontFamily: 'var(--font-sora)' }}>
             Settings
           </Typography>
           
           <List disablePadding sx={{ flex: 1 }}>
             {SETTINGS_TABS.map((tab) => (
               <ListItem key={tab.id} disablePadding sx={{ mb: 0.5 }}>
                 <ListItemButton
                   onClick={() => setActiveTab(tab.id)}
                   sx={{
                     borderRadius: 2,
                     bgcolor: activeTab === tab.id ? '#e2e8f0' : 'transparent',
                     color: activeTab === tab.id ? '#0f172a' : '#475569',
                     '&:hover': { bgcolor: activeTab === tab.id ? '#e2e8f0' : '#f1f5f9' },
                     py: 1
                   }}
                 >
                   <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
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
        <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
           
           {/* Top Header with Close Button */}
           <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, pb: 0 }}>
             <IconButton onClick={handleClose} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' } }}>
               <CloseIcon fontSize="small" />
             </IconButton>
           </Box>

           <DialogContent sx={{ p: { xs: 3, md: 5 }, pt: { md: 2 }, overflowY: 'scroll', display: 'flex', flexDirection: 'column' }}>
             
             {/* GENERAL SETTINGS */}
             {activeTab === 'general' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT } }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>General</Typography>
                  
                  {/* Simulated MFA / Security Box like reference */}
                  <Box sx={{ mb: 4 }}>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={500}>Appearance</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>System</Typography>
                    </Box>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={500}>Contrast</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>System</Typography>
                    </Box>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={500}>Accent Color</Typography>
                      <Box className="flex items-center gap-1.5 cursor-pointer">
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                        <Typography variant="body2" color="#3b82f6" fontWeight={600}>Blue</Typography>
                      </Box>
                    </Box>
                    <Box className="flex items-center justify-between" sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={500}>Language</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }}>Auto-detect</Typography>
                    </Box>
                  </Box>
                </Box>
             )}

             {/* EDIT PROFIL */}
             {activeTab === 'profil' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT }, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>Edit Profil</Typography>
                  
                  <Box className="flex items-center gap-4 mb-6">
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                      }}
                    >
                      {farmerProfile.nama.substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Button variant="outlined" size="small" sx={{ mb: 1, borderRadius: 2, color: 'text.primary', borderColor: 'divider' }}>Ganti Foto</Button>
                      <Typography variant="caption" display="block" color="text.secondary">Format JPG, PNG, atau GIF. Maksimal 2MB.</Typography>
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
                  
                  <Box sx={{ mt: 'auto', pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" sx={{ px: 4, borderRadius: 6, textTransform: 'none', bgcolor: '#111827', color: 'white' }}>Simpan Perubahan</Button>
                  </Box>
                </Box>
             )}

             {/* NOTIFIKASI */}
             {activeTab === 'notifikasi' && (
                <Box sx={{ minHeight: { md: TAB_CONTENT_MIN_HEIGHT } }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>Notifikasi</Typography>
                  
                  {[
                    { label: 'Notifikasi Cuaca Ekstrem', desc: 'Peringatan cuaca bahaya via WhatsApp' },
                    { label: 'Pengingat Jadwal Kegiatan', desc: 'Notifikasi H-1 sebelum jadwal pertanian' },
                    { label: 'Tips Budidaya dari Arina AI', desc: 'Saran mingguan kondisi lahan Anda' },
                  ].map((item) => (
                    <Box key={item.label} sx={{ py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box className="flex items-start justify-between gap-4">
                        <Box>
                          <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>{item.label}</Typography>
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
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 4, fontFamily: 'var(--font-sora)' }}>Informasi Sistem</Typography>
                  
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                     <Box sx={{ width: 60, height: 60, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <InfoOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                     </Box>
                     <Box>
                       <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>Arina Web Platform</Typography>
                       <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>Versi 1.0.0 (Beta)</Typography>
                     </Box>
                  </Box>

                  {[
                    { label: 'Platform Backend', value: 'Browser LocalStorage' },
                    { label: 'Desain Layout', value: 'Dialog Modal Concept' },
                  ].map((item) => (
                    <Box key={item.label} className="flex justify-between items-center py-3 border-b border-gray-100">
                      <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                      <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
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
