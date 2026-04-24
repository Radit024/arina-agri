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
  const [backendOnline, setBackendOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const data = await eventApi.getAll();
      setEvents(data);
      setBackendOnline(true);
      setError(null);
    } catch {
      const fallback = user ? [] : MOCK_EVENTS;
      setEvents(fallback);
      setBackendOnline(false);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addEvent = async (data: Parameters<typeof eventApi.create>[0]) => {
    if (backendOnline) {
      const created = await eventApi.create(data);
      setEvents((prev) => [created, ...prev]);
    } else {
      const newEv: ApiCalendarEvent = {
        ...data,
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEvents((prev) => [newEv, ...prev]);
    }
  };

  const updateEvent = async (id: string, data: Partial<ApiCalendarEvent>) => {
    if (backendOnline) {
      const updated = await eventApi.update(id, data);
      setEvents((prev) => prev.map((ev) => (ev._id === id ? updated : ev)));
    } else {
      setEvents((prev) => prev.map((ev) => (ev._id === id ? { ...ev, ...data, updatedAt: new Date().toISOString() } : ev)));
    }
  };

  const deleteEvent = async (id: string) => {
    if (backendOnline) {
      await eventApi.delete(id);
    }
    setEvents((prev) => prev.filter((ev) => ev._id !== id));
  };

  return {
    events,
    loading,
    backendOnline,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    reload: loadData,
  };
}
