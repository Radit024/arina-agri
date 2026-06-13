import { Controller, type Control, type FieldErrors, type SubmitHandler, type UseFormHandleSubmit } from 'react-hook-form';
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
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatDateLong } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import type { ApiCalendarEvent } from '@/lib/api';
import type { EventFormData } from '../_lib/eventSchema';
import CalendarCategoryIcon from './CalendarCategoryIcon';
import CalendarDayCell from './CalendarDayCell';
import { PageActionButton, PageHeader, PageShell } from '@/components/shared/page';

interface KalenderViewProps {
  calendarCells: (number | null)[];
  control: Control<EventFormData>;
  currentDate: Date;
  dayNames: string[];
  dialogOpen: boolean;
  editingEventId: string | null;
  errors: FieldErrors<EventFormData>;
  getDateStr: (day: number) => string;
  getEventsForDate: (day: number) => ApiCalendarEvent[];
  handleDelete: () => Promise<void>;
  handleSubmit: UseFormHandleSubmit<EventFormData>;
  jenisLabels: Record<string, string>;
  loading: boolean;
  month: number;
  monthNames: string[];
  onRetry: () => void | Promise<void>;
  onSubmit: SubmitHandler<EventFormData>;
  openAddDialog: (dateStr?: string) => void;
  openEditDialog: (event: ApiCalendarEvent) => void;
  setCurrentDate: (date: Date) => void;
  setDialogOpen: (open: boolean) => void;
  todayStr: string;
  upcomingEvents: ApiCalendarEvent[];
  weatherPlanningNote: string;
  weatherWarningMessage: string;
  year: number;
  error: string | null;
}

export default function KalenderView({
  calendarCells,
  control,
  dayNames,
  dialogOpen,
  editingEventId,
  errors,
  getDateStr,
  getEventsForDate,
  handleDelete,
  handleSubmit,
  jenisLabels,
  loading,
  month,
  monthNames,
  onRetry,
  onSubmit,
  openAddDialog,
  openEditDialog,
  setCurrentDate,
  setDialogOpen,
  todayStr,
  upcomingEvents,
  weatherPlanningNote,
  weatherWarningMessage,
  year,
  error,
}: KalenderViewProps) {
  const theme = useTheme();
  const t = useTranslations('Calendar');

  const jenisColors = {
    pemupukan: { bg: alpha(theme.palette.success.main, 0.12), text: theme.palette.success.main, dot: theme.palette.success.main },
    penyemprotan: { bg: alpha(theme.palette.error.main, 0.12), text: theme.palette.error.main, dot: theme.palette.error.main },
    irigasi: { bg: alpha(theme.palette.info.main, 0.12), text: theme.palette.info.main, dot: theme.palette.info.main },
    pemetikan: { bg: alpha(theme.palette.warning.main, 0.12), text: theme.palette.warning.dark, dot: theme.palette.warning.main },
    lainnya: { bg: alpha(theme.palette.grey[500], 0.12), text: theme.palette.text.secondary, dot: theme.palette.grey[500] },
  };

  const getEventColor = (jenis: ApiCalendarEvent['jenis']) => jenisColors[jenis] || jenisColors.lainnya;

  return (
    <PageShell
      data-testid="calendar-page-root"
      sx={{
        pb: { xs: 'calc(96px + env(safe-area-inset-bottom))', md: 3 },
      }}
    >
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        sx={{ mb: { xs: 2, md: 3 } }}
        actions={(
          <PageActionButton
            data-guide-target="calendar-add-schedule"
            data-touch-target="44"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openAddDialog()}
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, minHeight: 44 }}
          >
            {t('addSchedule')}
          </PageActionButton>
        )}
      />

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

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button data-touch-target="44" color="inherit" size="small" onClick={() => void onRetry()} sx={{ minHeight: 44 }}>
              {t('retry')}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Calendar */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card data-guide-target="calendar-grid">
            <CardHeader
              sx={{
                p: { xs: 2, sm: 2 },
                pb: { xs: 1, sm: 2 },
              }}
              title={
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    gap: 1,
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton data-touch-target="44" size="small" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, month - 1))} sx={{ height: 44, width: 44 }}>
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', minWidth: { xs: 112, sm: 180 }, textAlign: 'center', fontWeight: 700 }}>
                      {monthNames[month]} {year}
                    </Typography>
                    <IconButton data-touch-target="44" size="small" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, month + 1))} sx={{ height: 44, width: 44 }}>
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>
                  <Button data-touch-target="44" size="small" onClick={() => setCurrentDate(new Date())} variant="outlined" sx={{ minHeight: 44, px: 1.5 }}>
                    {t('today')}
                  </Button>
                </Box>
              }
            />
            <CardContent sx={{ pt: 0, pb: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
              {loading && <LinearProgress aria-label={t('loading')} sx={{ mb: 2 }} />}

              {/* Day headers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: { xs: 0.5, sm: 1 } }}>
                {dayNames.map((d: string) => (
                  <Box key={d} sx={{ textAlign: 'center', py: { xs: 0.5, sm: 1 } }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.78rem', sm: '0.82rem' }, fontWeight: 700, lineHeight: 1.2 }}
                    >
                      {d}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Calendar grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {calendarCells.map((day, idx) => {
                  if (!day) return <Box key={`empty-${idx}`} sx={{ minHeight: { xs: 58, sm: 72, md: 92 } }} />;
                  const dateStr = getDateStr(day);
                  const dayEvents = getEventsForDate(day);
                  const isToday = dateStr === todayStr;
                  const dateLabel = `${day} ${monthNames[month]} ${year}`;

                  return (
                    <CalendarDayCell
                      key={day}
                      dateLabel={dateLabel}
                      day={day}
                      events={dayEvents}
                      getEventColor={getEventColor}
                      isToday={isToday}
                      moreLabel={t('more')}
                      onAdd={() => openAddDialog(dateStr)}
                      onEdit={openEditDialog}
                    />
                  );
                })}
              </Box>

              {/* Legend */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 }, mt: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.25, sm: 2 }, borderTop: '1px solid', borderColor: 'divider' }}>
                {Object.entries(jenisColors).map(([key, val]) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          <PageActionButton
            data-guide-target="calendar-add-schedule"
            data-touch-target="44"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openAddDialog()}
            fullWidth
            sx={{ mb: 2, display: { xs: 'flex', sm: 'none' }, minHeight: 44 }}
          >
            {t('addSchedule')}
          </PageActionButton>

          <Card data-guide-target="calendar-upcoming">
            <CardHeader title={<Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>{t('upcomingTitle')}</Typography>} subheader={t('next7Days')} />
            <CardContent sx={{ pt: 0 }}>
              {upcomingEvents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">{t('emptyUpcoming')}</Typography>
                  <Button data-guide-target="calendar-add-schedule" data-touch-target="44" size="small" sx={{ mt: 1, minHeight: 44 }} onClick={() => openAddDialog()}>+ {t('addSchedule')}</Button>
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
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: colors.text, fontWeight: 600 }}>
                            {ev.judul}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={jenisLabels[ev.jenis]}
                              size="small"
                              sx={{ backgroundColor: 'rgba(0,0,0,0.06)', color: colors.text, fontWeight: 600, fontSize: '0.65rem' }}
                            />
                            <IconButton data-touch-target="44" size="small" aria-label="Edit event" onClick={(e) => { e.stopPropagation(); openEditDialog(ev); }} sx={{ height: 44, ml: 0.5, color: colors.text, width: 44 }}>
                              <EditIcon sx={{ fontSize: '1.25rem' }} />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: colors.text, opacity: 0.8, mt: 0.5, display: 'block' }}>
                          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarMonthIcon sx={{ fontSize: 14 }} aria-hidden />
                            <span>{formatDateLong(ev.tanggal)}{ev.waktu ? ` - ${ev.waktu}` : ''}</span>
                          </Box>
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
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="calendar-event-dialog-title"
        slotProps={{
          paper: {
            sx: {
              m: { xs: 2, sm: 4 },
              width: { xs: 'calc(100% - 32px)', sm: '100%' },
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle id="calendar-event-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
              {editingEventId ? t('dialog.editTitle') : t('dialog.addTitle')}
            </Typography>
            <IconButton data-touch-target="44" size="small" aria-label={t('dialog.close')} onClick={() => setDialogOpen(false)} sx={{ height: 44, width: 44 }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="event-form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller name="judul" control={control} render={({ field }) => (
              <TextField {...field} label={t('dialog.fields.title')} placeholder={t('dialog.fields.titlePlaceholder')} error={!!errors.judul} helperText={errors.judul?.message} fullWidth required />
            )} />

            <Controller name="jenis" control={control} render={({ field }) => (
              <FormControl fullWidth error={!!errors.jenis} required>
                <InputLabel>{t('dialog.fields.type')}</InputLabel>
                <Select {...field} label={t('dialog.fields.type')}>
                  <MenuItem value="pemupukan">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CalendarCategoryIcon jenis="pemupukan" />
                      {t('dialog.options.fertilizing')}
                    </Box>
                  </MenuItem>
                  <MenuItem value="penyemprotan">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CalendarCategoryIcon jenis="penyemprotan" />
                      {t('dialog.options.spraying')}
                    </Box>
                  </MenuItem>
                  <MenuItem value="irigasi">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CalendarCategoryIcon jenis="irigasi" />
                      {t('dialog.options.irrigation')}
                    </Box>
                  </MenuItem>
                  <MenuItem value="pemetikan">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CalendarCategoryIcon jenis="pemetikan" />
                      {t('dialog.options.harvest')}
                    </Box>
                  </MenuItem>
                  <MenuItem value="lainnya">
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CalendarCategoryIcon jenis="lainnya" />
                      {t('dialog.options.other')}
                    </Box>
                  </MenuItem>
                </Select>
                {errors.jenis && <FormHelperText>{errors.jenis.message}</FormHelperText>}
              </FormControl>
            )} />

            <Box
              role="group"
              aria-label={t('dialog.fields.scheduleTimeGroup')}
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <Controller name="tanggal" control={control} render={({ field }) => (
                <TextField {...field} type="date" label={t('dialog.fields.date')} error={!!errors.tanggal} helperText={errors.tanggal?.message} fullWidth required slotProps={{ inputLabel: { shrink: true } }} />
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
        <DialogActions
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'space-between',
            px: { xs: 2, sm: 3 },
            py: 2,
          }}
        >
          <Box>
            {editingEventId && (
              <Button data-touch-target="44" onClick={handleDelete} color="error" startIcon={<DeleteIcon />} sx={{ minHeight: 44 }}>{t('delete')}</Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button data-touch-target="44" onClick={() => setDialogOpen(false)} color="inherit" sx={{ minHeight: 44 }}>{t('cancel')}</Button>
            <Button data-touch-target="44" type="submit" form="event-form" variant="contained" disabled={loading} sx={{ minHeight: 44 }}>
              {loading ? <CircularProgress size={18} color="inherit" /> : t('saveSchedule')}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
