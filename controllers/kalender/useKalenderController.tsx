'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useMessages } from 'next-intl';
import { useCalendar } from '@/hooks/useCalendar';
import { useWeatherRiskSignal } from '@/hooks/useWeatherRiskSignal';
import type { ApiCalendarEvent } from '@/lib/api';
import { normalizeDateInputValue } from '@/lib/formatters';
import { trackPageView } from '@/lib/analytics/trackPageView';
import { getEventSchema, type EventFormData } from '@/lib/validators/eventSchema';

type CalendarMessages = {
  Calendar?: {
    daysShort?: string[];
    jenisLabels?: Record<string, string>;
    months?: string[];
  };
};

export function useKalenderController() {
  const t = useTranslations('Calendar');

  useEffect(() => {
    void trackPageView('kalender');
  }, []);

  const messages = useMessages() as CalendarMessages;
  const { events, loading, error, addEvent, updateEvent, deleteEvent, reload } = useCalendar();
  const { warningMessage: weatherWarningMessage, planningNote: weatherPlanningNote } = useWeatherRiskSignal('calendar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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

  const form = useForm<EventFormData>({
    resolver: zodResolver(getEventSchema(t)),
    defaultValues: { judul: '', jenis: 'pemupukan', tanggal: todayStr, waktu: '', catatan: '' },
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ApiCalendarEvent[]>();

    for (const event of events) {
      const list = map.get(event.tanggal) ?? [];
      list.push(event);
      map.set(event.tanggal, list);
    }

    return map;
  }, [events]);

  const getDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const getEventsForDate = (day: number) => eventsByDate.get(getDateStr(day)) ?? [];

  const openAddDialog = (dateStr?: string) => {
    setEditingEventId(null);
    form.reset({ judul: '', jenis: 'pemupukan', tanggal: dateStr || todayStr, waktu: '', catatan: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (event: ApiCalendarEvent) => {
    setEditingEventId(event._id);
    form.reset({
      judul: event.judul,
      jenis: event.jenis,
      tanggal: event.tanggal,
      waktu: event.waktu || '',
      catatan: event.catatan || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EventFormData) => {
    const payload = { ...data, tanggal: normalizeDateInputValue(data.tanggal) };
    if (editingEventId) {
      await updateEvent(editingEventId, payload);
    } else {
      await addEvent(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!editingEventId) return;
    await deleteEvent(editingEventId);
    setDialogOpen(false);
  };

  const upcomingEvents = events
    .filter((event) => event.tanggal >= todayStr)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .slice(0, 7);

  return {
    calendarCells,
    control: form.control,
    currentDate,
    dayNames: messages?.Calendar?.daysShort || [],
    dialogOpen,
    editingEventId,
    errors: form.formState.errors,
    getDateStr,
    getEventsForDate,
    handleDelete,
    handleSubmit: form.handleSubmit,
    jenisLabels: messages?.Calendar?.jenisLabels || {},
    loading,
    month,
    monthNames: messages?.Calendar?.months || [],
    onRetry: reload,
    onSubmit,
    openAddDialog,
    openEditDialog,
    error,
    setCurrentDate,
    setDialogOpen,
    todayStr,
    upcomingEvents,
    weatherPlanningNote,
    weatherWarningMessage,
    year,
  };
}
