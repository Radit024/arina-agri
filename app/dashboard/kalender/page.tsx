'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import FormHelperText from '@mui/material/FormHelperText';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import useLocalStorage from '@/hooks/useLocalStorage';
import { mockCalendarEvents } from '@/lib/mockData';
import { formatDateLong } from '@/lib/formatters';
import type { CalendarEvent } from '@/lib/mockData';

const eventSchema = z.object({
  judul: z.string().min(1, 'Masukkan judul kegiatan'),
  jenis: z.enum(['pemupukan', 'penyemprotan', 'irigasi', 'pemetikan', 'lainnya']),
  tanggal: z.string().min(1, 'Pilih tanggal'),
  waktu: z.string().optional(),
  catatan: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

const jenisColors = {
  pemupukan: { bg: '#dcfce7', text: '#16a34a', dot: '#16a34a' },
  penyemprotan: { bg: '#fee2e2', text: '#dc2626', dot: '#dc2626' },
  irigasi: { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  pemetikan: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  lainnya: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
};

const jenisLabels = {
  pemupukan: 'Pemupukan',
  penyemprotan: 'Penyemprotan',
  irigasi: 'Irigasi',
  pemetikan: 'Pemetikan/Panen',
  lainnya: 'Lainnya',
};

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function KalenderPage() {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>('arina-events', mockCalendarEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getEventsForDate = (day: number) =>
    events.filter((e) => e.tanggal === getDateStr(day));

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { judul: '', jenis: 'pemupukan', tanggal: todayStr, waktu: '', catatan: '' },
  });

  const onSubmit = (data: EventFormData) => {
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      judul: data.judul,
      jenis: data.jenis,
      tanggal: data.tanggal,
      waktu: data.waktu,
      catatan: data.catatan,
    };
    setEvents((prev) => [...prev, newEvent]);
    reset();
    setDialogOpen(false);
  };

  const upcomingEvents = events
    .filter((e) => e.tanggal >= todayStr)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .slice(0, 7);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box className="flex items-center justify-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)' }}>
            Smart Kalender
          </Typography>
          <Typography variant="body2" color="text.secondary">Jadwal kegiatan pertanian Anda</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          Tambah Jadwal
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title={
                <Box className="flex items-center justify-between">
                  <Box className="flex items-center gap-2">
                    <IconButton size="small" onClick={() => setCurrentDate(new Date(year, month - 1))}>
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" fontWeight={700} sx={{ fontFamily: 'var(--font-sora)', minWidth: 180, textAlign: 'center' }}>
                      {monthNames[month]} {year}
                    </Typography>
                    <IconButton size="small" onClick={() => setCurrentDate(new Date(year, month + 1))}>
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>
                  <Button size="small" onClick={() => setCurrentDate(new Date())} variant="outlined">
                    Hari ini
                  </Button>
                </Box>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {/* Day headers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
                {dayNames.map((d) => (
                  <Box key={d} sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">{d}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Calendar grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {calendarCells.map((day, idx) => {
                  if (!day) return <Box key={`empty-${idx}`} sx={{ minHeight: 80 }} />;
                  const dateStr = getDateStr(day);
                  const dayEvents = getEventsForDate(day);
                  const isToday = dateStr === todayStr;

                  return (
                    <Box
                      key={day}
                      sx={{
                        minHeight: 80,
                        p: 0.75,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: isToday ? 'primary.main' : 'transparent',
                        backgroundColor: isToday ? 'primary.light' : 'transparent',
                        '&:hover': { backgroundColor: '#f8fafc' },
                        cursor: 'pointer',
                        transition: 'background-color 0.1s',
                      }}
                      onClick={() => { setDialogOpen(true); }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={isToday ? 700 : 500}
                        sx={{ color: isToday ? 'primary.main' : 'text.primary', display: 'block', mb: 0.5 }}
                      >
                        {day}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {dayEvents.slice(0, 2).map((ev) => (
                          <Box
                            key={ev.id}
                            sx={{
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: jenisColors[ev.jenis]?.dot || '#94a3b8',
                              opacity: 0.85,
                            }}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                            +{dayEvents.length - 2}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Legend */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {Object.entries(jenisColors).map(([key, val]) => (
                  <Box key={key} className="flex items-center gap-1">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: val.dot }} />
                    <Typography variant="caption" color="text.secondary">{jenisLabels[key as keyof typeof jenisLabels]}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Events */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            fullWidth
            sx={{ mb: 2, display: { xs: 'flex', sm: 'none' } }}
          >
            Tambah Jadwal
          </Button>

          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>Jadwal Mendatang</Typography>} subheader="7 hari ke depan" />
            <CardContent sx={{ pt: 0 }}>
              {upcomingEvents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">Belum ada jadwal mendatang</Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => setDialogOpen(true)}>+ Tambah Jadwal</Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {upcomingEvents.map((ev) => {
                    const colors = jenisColors[ev.jenis] || jenisColors.lainnya;
                    return (
                      <Box
                        key={ev.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: colors.bg,
                          borderLeft: '3px solid',
                          borderLeftColor: colors.dot,
                        }}
                      >
                        <Box className="flex items-start justify-between">
                          <Typography variant="body2" fontWeight={600} sx={{ color: colors.text }}>
                            {ev.judul}
                          </Typography>
                          <Chip
                            label={jenisLabels[ev.jenis]}
                            size="small"
                            sx={{ backgroundColor: 'rgba(0,0,0,0.06)', color: colors.text, fontWeight: 600, fontSize: '0.65rem' }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: colors.text, opacity: 0.8, mt: 0.5, display: 'block' }}>
                          📅 {formatDateLong(ev.tanggal)}{ev.waktu ? ` · ${ev.waktu}` : ''}
                        </Typography>
                        {ev.catatan && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {ev.catatan}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box className="flex items-center justify-between">
            <Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'var(--font-sora)' }}>
              Tambah Jadwal Kegiatan
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="event-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Controller name="judul" control={control} render={({ field }) => (
              <TextField {...field} label="Judul Kegiatan" placeholder="Contoh: Pemupukan Susulan NPK" error={!!errors.judul} helperText={errors.judul?.message} fullWidth />
            )} />

            <Controller name="jenis" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.jenis}>
                <InputLabel>Jenis Kegiatan</InputLabel>
                <Select {...field} label="Jenis Kegiatan">
                  <MenuItem value="pemupukan">🌿 Pemupukan</MenuItem>
                  <MenuItem value="penyemprotan">💧 Penyemprotan Pestisida</MenuItem>
                  <MenuItem value="irigasi">🚿 Irigasi</MenuItem>
                  <MenuItem value="pemetikan">🌶️ Pemetikan/Panen</MenuItem>
                  <MenuItem value="lainnya">📝 Lainnya</MenuItem>
                </Select>
                {errors.jenis && <FormHelperText>{errors.jenis.message}</FormHelperText>}
              </FormControl>
            )} />

            <Box className="flex gap-3">
              <Controller name="tanggal" control={control} render={({ field }) => (
                <TextField {...field} type="date" label="Tanggal" error={!!errors.tanggal} helperText={errors.tanggal?.message} fullWidth InputLabelProps={{ shrink: true }} />
              )} />
              <Controller name="waktu" control={control} render={({ field }) => (
                <TextField {...field} type="time" label="Waktu (opsional)" fullWidth InputLabelProps={{ shrink: true }} />
              )} />
            </Box>

            <Controller name="catatan" control={control} render={({ field }) => (
              <TextField {...field} label="Catatan (opsional)" multiline rows={3} placeholder="Tambahkan catatan tambahan..." fullWidth />
            )} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Batal</Button>
          <Button type="submit" form="event-form" variant="contained">Simpan Jadwal</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
