export type NotificationSchedulePlatform = 'whatsapp' | 'telegram';

export interface NotificationScheduleRow {
  id: string;
  user_id: string;
  enabled: boolean;
  time: string;
  timezone?: string | null;
  platform: NotificationSchedulePlatform;
  recipient_number?: string | null;
  telegram_chat_id?: string | null;
  recipient_name?: string | null;
  custom_message?: string | null;
  weather_adm4?: string | null;
  weather_location_label?: string | null;
  last_sent_at?: string | null;
}

export interface NotificationSchedulePayload {
  enabled: boolean;
  time: string;
  timezone?: string;
  platform: NotificationSchedulePlatform;
  to: string;
  recipientName?: string;
  customMessage?: string;
  weatherAdm4?: string;
  weatherLocationLabel?: string;
}

export function isValidScheduleTime(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return Boolean(match);
}

function getDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseTimeToMinutes(time: string) {
  const [hour, minute] = time.split(':').map((value) => Number(value));
  return hour * 60 + minute;
}

export function isScheduleDue(
  schedule: NotificationScheduleRow,
  now: Date,
  toleranceMinutes: number = 60
) {
  if (!schedule.enabled) return false;
  if (!isValidScheduleTime(schedule.time)) return false;

  const timezone = schedule.timezone || 'Asia/Jakarta';

  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const [currHour, currMin] = localTime.split(':').map(Number);
  const currentMinutes = currHour * 60 + currMin;
  const scheduledMinutes = parseTimeToMinutes(schedule.time);

  const diff = Math.abs(currentMinutes - scheduledMinutes);
  if (diff > toleranceMinutes) return false;

  if (schedule.last_sent_at) {
    const sentDate = getDateKey(new Date(schedule.last_sent_at), timezone);
    const today = getDateKey(now, timezone);
    if (sentDate === today) return false;
  }

  return true;
}

export function validateSchedulePayload(body: any): { valid: boolean; message?: string; payload?: NotificationSchedulePayload } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.time || typeof body.time !== 'string' || !isValidScheduleTime(body.time)) {
    return { valid: false, message: 'Field time harus berupa format HH:mm.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  const weatherAdm4 = typeof body.weatherAdm4 === 'string' ? body.weatherAdm4.trim() : '';
  if (Boolean(body.enabled) && !weatherAdm4) {
    return { valid: false, message: 'Field weatherAdm4 wajib diisi saat jadwal notifikasi aktif.' };
  }

  return {
    valid: true,
    payload: {
      enabled: Boolean(body.enabled),
      time: body.time,
      timezone: body.timezone || 'Asia/Jakarta',
      platform: body.platform,
      to: body.to,
      recipientName: body.recipientName || 'Petani',
      customMessage: body.customMessage,
      weatherAdm4: weatherAdm4 || undefined,
      weatherLocationLabel: typeof body.weatherLocationLabel === 'string'
        ? body.weatherLocationLabel.trim() || undefined
        : undefined,
    },
  };
}
