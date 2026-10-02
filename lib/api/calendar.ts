// Akses data domain: calendar.

import type {
  ApiCalendarEvent,
} from './types';
import { authenticatedJsonRequest } from './client';

export const eventApi = {
  getAll: async (): Promise<ApiCalendarEvent[]> => {
    return authenticatedJsonRequest<ApiCalendarEvent[]>('/api/calendar/events', { method: 'GET' });
  },

  create: async (payload: Omit<ApiCalendarEvent, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiCalendarEvent> => {
    return authenticatedJsonRequest<ApiCalendarEvent>('/api/calendar/events', { method: 'POST', body: payload });
  },

  update: async (id: string, payload: Partial<ApiCalendarEvent>): Promise<ApiCalendarEvent> => {
    return authenticatedJsonRequest<ApiCalendarEvent>('/api/calendar/events', {
      method: 'PATCH',
      body: { id, ...payload },
    });
  },

  toggleComplete: async (id: string): Promise<ApiCalendarEvent> => {
    return authenticatedJsonRequest<ApiCalendarEvent>('/api/calendar/events', {
      method: 'PATCH',
      body: { id, action: 'toggleComplete' },
    });
  },

  delete: async (id: string): Promise<null> => {
    return authenticatedJsonRequest<null>(`/api/calendar/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

// ─── Stok Panen API ───────────────────────────────────────────────