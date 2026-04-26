'use client';

import { useState, useEffect, useCallback } from 'react';
import { eventApi, type ApiCalendarEvent } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { mockCalendarEvents } from '@/lib/mockData';

const MOCK_EVENTS: ApiCalendarEvent[] = mockCalendarEvents.map((ev) => ({
  _id: ev.id,
  judul: ev.judul,
  tanggal: ev.tanggal,
  jenis: ev.jenis,
  waktu: ev.waktu || '',
  catatan: ev.catatan || '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export function useCalendar() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<ApiCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user) {
        setEvents(MOCK_EVENTS);
        setLoading(false);
        return;
      }
      const data = await eventApi.getAll();
      setEvents(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat jadwal');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEvent = async (data: Parameters<typeof eventApi.create>[0]) => {
    const created = await eventApi.create(data);
    setEvents((prev) => [created, ...prev]);
  };

  const updateEvent = async (id: string, data: Partial<ApiCalendarEvent>) => {
    const updated = await eventApi.update(id, data);
    setEvents((prev) => prev.map((ev) => (ev._id === id ? updated : ev)));
  };

  const toggleEvent = async (id: string) => {
    const updated = await eventApi.toggleComplete(id);
    setEvents((prev) => prev.map((ev) => (ev._id === id ? updated : ev)));
  };

  const deleteEvent = async (id: string) => {
    await eventApi.delete(id);
    setEvents((prev) => prev.filter((ev) => ev._id !== id));
  };

  return {
    events,
    loading,
    backendOnline: true,
    error,
    addEvent,
    updateEvent,
    toggleEvent,
    deleteEvent,
    reload: loadData,
  };
}
