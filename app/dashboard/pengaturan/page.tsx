'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { farmerProfile } from '@/lib/mockData';

export default function PengaturanPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
          Pengaturan
        </Typography>
        <Typography variant="body2" color="text.secondary">Kelola profil dan preferensi akun Anda</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Profil Pengguna</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <Box className="flex items-center gap-4 mb-4">
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  BS
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{farmerProfile.nama}</Typography>
                  <Typography variant="body2" color="text.secondary">{farmerProfile.lokasi}</Typography>
                  <Button size="small" sx={{ mt: 0.5, px: 0 }}>Ganti Foto</Button>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Nama Lengkap" defaultValue={farmerProfile.nama} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Lokasi / Desa" defaultValue={farmerProfile.lokasi} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Komoditas Utama" defaultValue={farmerProfile.komoditas} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Luas Lahan" defaultValue={farmerProfile.luasLahan} />
                </Grid>
              </Grid>
              <Button variant="contained" sx={{ mt: 2.5 }}>Simpan Perubahan</Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Pengaturan Notifikasi</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              {[
                { label: 'Notifikasi Cuaca Ekstrem', desc: 'Terima peringatan cuaca via WhatsApp' },
                { label: 'Pengingat Jadwal Kegiatan', desc: 'Notifikasi H-1 sebelum jadwal pertanian' },
                { label: 'Laporan Keuangan Mingguan', desc: 'Ringkasan laba rugi setiap hari Senin' },
                { label: 'Tips Budidaya dari Arina AI', desc: 'Saran mingguan berdasarkan kondisi lahan Anda' },
              ].map((item, index) => (
                <Box key={item.label}>
                  {index > 0 && <Divider sx={{ my: 1.5 }} />}
                  <Box className="flex items-center justify-between">
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{item.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                    </Box>
                    <Switch defaultChecked color="primary" />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* App Info */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Informasi Aplikasi</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              {[
                { label: 'Versi Aplikasi', value: '1.0.0 (Beta)' },
                { label: 'Platform', value: 'Arina Agri Web Dashboard' },
                { label: 'Data disimpan di', value: 'Browser LocalStorage' },
                { label: 'Dikembangkan oleh', value: 'Arina Agri Team' },
              ].map((item) => (
                <Box key={item.label} className="flex justify-between items-center py-2">
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{item.value}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
