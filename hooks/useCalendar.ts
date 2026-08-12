'use client';

import { useState, useEffect, useCallback } from 'react';
import { eventApi, type ApiCalendarEvent } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';
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
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const storageKey = `arina-calendar-events-${user?.id ?? 'guest'}`;
  const [events, setEvents] = useSessionStorage<ApiCalendarEvent[]>(storageKey, MOCK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user || isGuestMode) {
        setLoading(false);
        return;
      }
      const data = await eventApi.getAll();
      setEvents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat jadwal');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, isGuestMode, setEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEvent = async (data: Parameters<typeof eventApi.create>[0]) => {
    if (isGuestMode) {
      const created: ApiCalendarEvent = {
        ...data,
        _id: `mock-ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        waktu: data.waktu || '',
        catatan: data.catatan || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEvents((prev) => [created, ...prev]);
      return;
    }
    const created = await eventApi.create(data);
    setEvents((prev) => [created, ...prev]);
  };

  const updateEvent = async (id: string, data: Partial<ApiCalendarEvent>) => {
    if (isGuestMode) {
      setEvents((prev) => prev.map((ev) => (ev._id === id ? { ...ev, ...data, updatedAt: new Date().toISOString() } : ev)));
      return;
    }
    const updated = await eventApi.update(id, data);
    setEvents((prev) => prev.map((ev) => (ev._id === id ? updated : ev)));
  };

  const toggleEvent = async (id: string) => {
    if (isGuestMode) {
      setEvents((prev) => prev.map((ev) => (ev._id === id ? { ...ev, updatedAt: new Date().toISOString() } : ev)));
      return;
    }
    const updated = await eventApi.toggleComplete(id);
    setEvents((prev) => prev.map((ev) => (ev._id === id ? updated : ev)));
  };

  const deleteEvent = async (id: string) => {
    if (isGuestMode) {
      setEvents((prev) => prev.filter((ev) => ev._id !== id));
      return;
    }
    await eventApi.delete(id);
    setEvents((prev) => prev.filter((ev) => ev._id !== id));
  };

  return {
    events,
    loading,
    backendOnline: !isGuestMode,
    error,
    addEvent,
    updateEvent,
    toggleEvent,
    deleteEvent,
    reload: loadData,
  };
}
