// Akses data domain: notifications.

import type {
  NotificationDecisionInput,
  NotificationDecisionResponse,
  NotificationScheduleConfig,
} from './types';
import { apiFetch, buildAuthHeaders } from './client';

export const notificationApi = {
  decide: (payload: NotificationDecisionInput) =>
    apiFetch<NotificationDecisionResponse['decision']>('/api/notification/decide', payload),

  decideAndSend: (payload: NotificationDecisionInput) =>
    apiFetch<NotificationDecisionResponse>('/api/notification/decide-send', payload),
};

async function getNotificationSchedule(): Promise<NotificationScheduleConfig> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/notification/schedule', { headers });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP error ${res.status}`);
  return json.data as NotificationScheduleConfig;
}


export const notificationScheduleApi = {
  get: () => getNotificationSchedule(),
  set: async (payload: NotificationScheduleConfig) => {
    const headers = await buildAuthHeaders();
    return fetch('/api/notification/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    }).then((res) => res.json());
  },
};
