'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme, alpha } from '@mui/material/styles';
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
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import useLocalStorage from '@/hooks/useLocalStorage';
import { mockCalendarEvents } from '@/lib/mockData';
import { formatDateLong } from '@/lib/formatters';
import type { CalendarEvent } from '@/lib/mockData';
import { useTranslations } from 'next-intl';

const getEventSchema = (t: any) => z.object({
  judul: z.string().min(1, t('validation.titleRequired')),
  jenis: z.enum(['pemupukan', 'penyemprotan', 'irigasi', 'pemetikan', 'lainnya']),
  tanggal: z.string().min(1, t('validation.dateRequired')),
  waktu: z.string().optional(),
  catatan: z.string().optional(),
});

type EventFormData = z.infer<ReturnType<typeof getEventSchema>>;


import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/hooks/useCalendar';
import type { ApiCalendarEvent } from '@/lib/api';
import { weatherApi } from '@/lib/api';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import {
  type GpsLocationSnapshot,
} from '@/lib/weatherLocation';

export default function KalenderPage() {
  const theme = useTheme();
  const t = useTranslations('Calendar');
  const { user } = useAuth();
  
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();
  
  const jenisColors = {
    pemupukan: { bg: alpha(theme.palette.success.main, 0.12), text: theme.palette.success.main, dot: theme.palette.success.main },
    penyemprotan: { bg: alpha(theme.palette.error.main, 0.12), text: theme.palette.error.main, dot: theme.palette.error.main },
    irigasi: { bg: alpha(theme.palette.info.main, 0.12), text: theme.palette.info.main, dot: theme.palette.info.main },
    pemetikan: { bg: alpha(theme.palette.warning.main, 0.12), text: theme.palette.warning.dark, dot: theme.palette.warning.main },
    lainnya: { bg: alpha(theme.palette.grey[500], 0.12), text: theme.palette.text.secondary, dot: theme.palette.grey[500] },
  };
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [weatherWarningMessage, setWeatherWarningMessage] = useState<string>('');
  const [weatherPlanningNote, setWeatherPlanningNote] = useState<string>('');
  const { activeAdm4, activeLocationLabel } = useWeatherLocation();

  useEffect(() => {
    let active = true;

    async function loadWeatherPlanningSignal() {
      try {
        const [forecast, warnings] = await Promise.all([
          activeAdm4
            ? weatherApi.getForecast({ adm4: activeAdm4, locationLabel: activeLocationLabel })
            : Promise.resolve(null),
          weatherApi.getWarnings(),
        ]);
        if (!active) return;

        if (warnings.warnings.length > 0) {
          const topWarning = warnings.warnings[0];
          setWeatherWarningMessage(topWarning.headline || topWarning.description || topWarning.event);
        } else {
          setWeatherWarningMessage('');
        }

        const wetDay = forecast?.days.find((day) => day.totalRainfallMm >= 15);
        if (wetDay) {
          setWeatherPlanningNote(`Saran kalender: ${wetDay.date} berpotensi hujan ${wetDay.totalRainfallMm}mm, prioritaskan pekerjaan non-lapang.`);
        } else {
          setWeatherPlanningNote('');
        }
      } catch {
        if (!active) return;
        setWeatherWarningMessage('');
        setWeatherPlanningNote('');
      }
    }

    void loadWeatherPlanningSignal();
    return () => {
      active = false;
    };
  }, [activeAdm4, activeLocationLabel]);

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

  const monthNames = t.raw('months');
  const dayNames = t.raw('daysShort');
  const jenisLabels = t.raw('jenisLabels');

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(getEventSchema(t)),
    defaultValues: { judul: '', jenis: 'pemupukan', tanggal: todayStr, waktu: '', catatan: '' },
  });

  const openAddDialog = (dateStr?: string) => {
    setEditingEventId(null);
    reset({ judul: '', jenis: 'pemupukan', tanggal: dateStr || todayStr, waktu: '', catatan: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (ev: ApiCalendarEvent) => {
    setEditingEventId(ev._id);
    reset({
      judul: ev.judul,
      jenis: ev.jenis,
      tanggal: ev.tanggal,
      waktu: ev.waktu || '',
      catatan: ev.catatan || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EventFormData) => {
    if (editingEventId) {
      await updateEvent(editingEventId, data);
    } else {
      await addEvent(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (editingEventId) {
      await deleteEvent(editingEventId);
      setDialogOpen(false);
    }
  };

  const upcomingEvents = events
    .filter((e) => e.tanggal >= todayStr)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .slice(0, 7);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box className="flex items-center justify-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
              {t('title')}
          </Typography>
            <Typography variant="body2" color="text.secondary">{t('subtitle')}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openAddDialog()}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          {t('addSchedule')}
        </Button>
      </Box>

      {weatherWarningMessage && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {weatherWarningMessage}
        </Alert>
      )}

      {weatherPlanningNote && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {weatherPlanningNote}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title={
                <Box className="flex items-center justify-between">
                  <Box className="flex items-center gap-2">
                    <IconButton size="small" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, month - 1))}>
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', minWidth: 180, textAlign: 'center', fontWeight: 700 }}>
                      {monthNames[month]} {year}
                    </Typography>
                    <IconButton size="small" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, month + 1))}>
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>
                  <Button size="small" onClick={() => setCurrentDate(new Date())} variant="outlined">
                    {t('today')}
                  </Button>
                </Box>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {/* Day headers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
                {dayNames.map((d: string) => (
                  <Box key={d} sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{d}</Typography>
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
                      onClick={() => openAddDialog(dateStr)}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: isToday ? 'primary.main' : 'text.primary', display: 'block', mb: 0.5, fontWeight: isToday ? 700 : 500 }}
                      >
                        {day}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {dayEvents.slice(0, 3).map((ev) => (
                          <Box
                            key={ev._id}
                            onClick={(e) => { e.stopPropagation(); openEditDialog(ev); }}
                            sx={{
                              borderRadius: 1,
                              backgroundColor: jenisColors[ev.jenis]?.bg || '#f1f5f9',
                              borderLeft: '2px solid',
                              borderLeftColor: jenisColors[ev.jenis]?.dot || '#94a3b8',
                              px: 0.5,
                              py: 0.25,
                              overflow: 'hidden',
                              '&:hover': { filter: 'brightness(0.95)' }
                            }}
                          >
                             <Typography noWrap variant="caption" sx={{ fontSize: '0.65rem', display: 'block', color: jenisColors[ev.jenis]?.text, fontWeight: 600 }}>{ev.judul}</Typography>
                          </Box>
                        ))}
                        {dayEvents.length > 3 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem', pl: 0.5 }}>
                            +{dayEvents.length - 3} {t('more')}
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
            onClick={() => openAddDialog()}
            fullWidth
            sx={{ mb: 2, display: { xs: 'flex', sm: 'none' } }}
          >
            {t('addSchedule')}
          </Button>

          <Card>
            <CardHeader title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('upcomingTitle')}</Typography>} subheader={t('next7Days')} />
            <CardContent sx={{ pt: 0 }}>
              {upcomingEvents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">{t('emptyUpcoming')}</Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => openAddDialog()}>+ {t('addSchedule')}</Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {upcomingEvents.map((ev) => {
                    const colors = jenisColors[ev.jenis] || jenisColors.lainnya;
                    return (
                      <Box
                        key={ev._id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: colors.bg,
                          borderLeft: '3px solid',
                          borderLeftColor: colors.dot,
                        }}
                      >
                        <Box className="flex items-start justify-between">
                          <Typography variant="body2" sx={{ color: colors.text, fontWeight: 600 }}>
                            {ev.judul}
                          </Typography>
                          <Box className="flex items-center gap-1">
                            <Chip
                              label={jenisLabels[ev.jenis]}
                              size="small"
                              sx={{ backgroundColor: 'rgba(0,0,0,0.06)', color: colors.text, fontWeight: 600, fontSize: '0.65rem' }}
                            />
                            <IconButton size="small" aria-label="Edit event" onClick={(e) => { e.stopPropagation(); openEditDialog(ev); }} sx={{ ml: 0.5, color: colors.text, p: 0.5 }}>
                              <EditIcon sx={{ fontSize: '1.25rem' }} />
                            </IconButton>
                          </Box>
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
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
              {editingEventId ? t('dialog.editTitle') : t('dialog.addTitle')}
            </Typography>
            <IconButton size="small" onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="event-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Controller name="judul" control={control} render={({ field }) => (
              <TextField {...field} label={t('dialog.fields.title')} placeholder={t('dialog.fields.titlePlaceholder')} error={!!errors.judul} helperText={errors.judul?.message} fullWidth />
            )} />

            <Controller name="jenis" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.jenis}>
                <InputLabel>{t('dialog.fields.type')}</InputLabel>
                <Select {...field} label={t('dialog.fields.type')}>
                  <MenuItem value="pemupukan">🌿 {t('dialog.options.fertilizing')}</MenuItem>
                  <MenuItem value="penyemprotan">💧 {t('dialog.options.spraying')}</MenuItem>
                  <MenuItem value="irigasi">🚿 {t('dialog.options.irrigation')}</MenuItem>
                  <MenuItem value="pemetikan">🌶️ {t('dialog.options.harvest')}</MenuItem>
                  <MenuItem value="lainnya">📝 {t('dialog.options.other')}</MenuItem>
                </Select>
                {errors.jenis && <FormHelperText>{errors.jenis.message}</FormHelperText>}
              </FormControl>
            )} />

            <Box className="flex gap-3">
              <Controller name="tanggal" control={control} render={({ field }) => (
                <TextField {...field} type="date" label={t('dialog.fields.date')} error={!!errors.tanggal} helperText={errors.tanggal?.message} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              )} />
              <Controller name="waktu" control={control} render={({ field }) => (
                <TextField {...field} type="time" label={t('dialog.fields.timeOptional')} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              )} />
            </Box>

            <Controller name="catatan" control={control} render={({ field }) => (
              <TextField {...field} label={t('dialog.fields.noteOptional')} multiline rows={3} placeholder={t('dialog.fields.notePlaceholder')} fullWidth />
            )} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            {editingEventId && (
              <Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />}>{t('delete')}</Button>
            )}
          </Box>
          <Box className="flex gap-2">
            <Button onClick={() => setDialogOpen(false)} color="inherit">{t('cancel')}</Button>
            <Button type="submit" form="event-form" variant="contained">{t('saveSchedule')}</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
