'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import GrainIcon from '@mui/icons-material/Grain';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AirIcon from '@mui/icons-material/Air';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { currentWeather, weatherForecast, weatherAlerts } from '@/lib/mockData';
import { formatDateShort } from '@/lib/formatters';

function WeatherIcon({ kondisi, size = 'medium' }: { kondisi: string; size?: 'small' | 'medium' | 'large' }) {
  const fontSize = size === 'small' ? 20 : size === 'large' ? 48 : 32;
  if (kondisi === 'cerah') return <WbSunnyIcon sx={{ fontSize, color: '#f59e0b' }} />;
  if (kondisi === 'berawan') return <CloudIcon sx={{ fontSize, color: '#94a3b8' }} />;
  if (kondisi === 'hujan') return <UmbrellaIcon sx={{ fontSize, color: '#3b82f6' }} />;
  return <GrainIcon sx={{ fontSize, color: '#60a5fa' }} />;
}

export default function CuacaPage() {
  const [hp, setHp] = useState('');
  const [notifAktif, setNotifAktif] = useState(true);
  const [savedHp, setSavedHp] = useState(false);

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
          Notifikasi Cuaca
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pantau cuaca dan terima peringatan otomatis di WhatsApp
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Current Weather */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #2563eb 100%)', color: '#fff' }}>
            <CardContent sx={{ p: 3 }}>
              <Box className="flex items-start justify-between">
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cuaca Saat Ini
                  </Typography>
                  <Typography variant="h3" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)', mt: 0.5, color: '#fff' }}>
                    {currentWeather.suhu}°C
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5, textTransform: 'capitalize' }}>
                    {currentWeather.kondisi === 'gerimis' ? 'Gerimis Ringan' : currentWeather.kondisi}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                    📍 {currentWeather.lokasi}
                  </Typography>
                </Box>
                <WeatherIcon kondisi={currentWeather.kondisi} size="large" />
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 2.5 }} />

              <Grid container spacing={2}>
                {[
                  { icon: <WaterDropIcon />, label: 'Kelembapan', value: `${currentWeather.kelembapan}%` },
                  { icon: <GrainIcon />, label: 'Curah Hujan', value: `${currentWeather.curahHujan} mm` },
                  { icon: <AirIcon />, label: 'Kec. Angin', value: `${currentWeather.kecepatanAngin} km/j` },
                  { icon: <ThermostatIcon />, label: 'Suhu', value: `${currentWeather.suhu}°C` },
                ].map((item) => (
                  <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
                    <Box className="flex items-center gap-2">
                      <Box sx={{ color: 'rgba(255,255,255,0.7)' }}>{item.icon}</Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>{item.label}</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: '#fff' }}>{item.value}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* 7-Day Forecast */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Prakiraan 7 Hari</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                {weatherForecast.map((day) => {
                  const date = new Date(day.tanggal);
                  const dayName = dayNames[date.getDay()];
                  const dateNum = date.getDate();
                  const isToday = day.tanggal === new Date().toISOString().split('T')[0];
                  return (
                    <Box
                      key={day.tanggal}
                      sx={{
                        minWidth: 90,
                        p: 2,
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: isToday ? 'primary.main' : 'divider',
                        backgroundColor: isToday ? 'primary.light' : 'transparent',
                        flexShrink: 0,
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} color={isToday ? 'primary.main' : 'text.secondary'}>
                        {isToday ? 'Hari ini' : `${dayName} ${dateNum}`}
                      </Typography>
                      <Box sx={{ my: 1 }}>
                        <WeatherIcon kondisi={day.kondisi} size="small" />
                      </Box>
                      <Typography variant="caption" display="block" fontWeight={700}>{day.suhuMax}°</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">{day.suhuMin}°</Typography>
                      {day.curahHujan > 0 && (
                        <Typography variant="caption" display="block" sx={{ color: '#3b82f6', mt: 0.5 }}>
                          💧{day.curahHujan}mm
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Alert History */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Riwayat Notifikasi</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Tanggal', 'Jenis Peringatan', 'Pesan', 'Status'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {weatherAlerts.map((alert) => (
                      <TableRow key={alert.id} sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{formatDateShort(alert.tanggal)}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{alert.jenisPeringatan}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', maxWidth: 280 }}>
                          <Typography variant="caption" noWrap display="block">{alert.pesan}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={alert.status === 'terkirim' ? 'Terkirim' : 'Gagal'}
                            size="small"
                            sx={{
                              backgroundColor: alert.status === 'terkirim' ? '#dcfce7' : '#fee2e2',
                              color: alert.status === 'terkirim' ? '#16a34a' : '#dc2626',
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

        {/* WhatsApp Integration */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader
              avatar={<WhatsAppIcon sx={{ color: '#25d366' }} />}
              title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Integrasi WhatsApp</Typography>}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ backgroundColor: '#f0fdf4', borderRadius: 2, p: 2, mb: 2.5, border: '1px solid #bbf7d0' }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Notifikasi dikirim otomatis via WhatsApp menggunakan <strong>n8n workflow</strong> saat kondisi cuaca ekstrem terdeteksi.
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={notifAktif}
                    onChange={(e) => setNotifAktif(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={500}>
                    Aktifkan notifikasi otomatis
                  </Typography>
                }
                sx={{ mb: 2.5, display: 'flex' }}
              />

              <TextField
                fullWidth
                label="Nomor WhatsApp"
                placeholder="Contoh: 08123456789"
                value={hp}
                onChange={(e) => { setHp(e.target.value); setSavedHp(false); }}
                helperText="Nomor yang akan menerima notifikasi cuaca"
                disabled={!notifAktif}
                sx={{ mb: 2 }}
              />

              <Button
                fullWidth
                variant={savedHp ? 'outlined' : 'contained'}
                color={savedHp ? 'success' : 'primary'}
                disabled={!notifAktif || !hp}
                onClick={() => setSavedHp(true)}
                startIcon={<WhatsAppIcon />}
              >
                {savedHp ? '✓ Nomor Tersimpan' : 'Simpan & Aktifkan'}
              </Button>

              {notifAktif && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Jenis peringatan aktif
                  </Typography>
                  {['Hujan Lebat (> 20mm)', 'Angin Kencang (> 12 km/j)', 'Suhu Ekstrem (> 32°C)', 'Kelembapan Rendah (< 50%)'].map((item) => (
                    <Box key={item} className="flex items-center gap-2 mt-2">
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'primary.main' }} />
                      <Typography variant="caption" color="text.secondary">{item}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
