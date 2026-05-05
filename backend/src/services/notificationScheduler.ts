import fs from 'fs';
import path from 'path';
import cron, { type ScheduledTask } from 'node-cron';
import { buildNotificationDecision } from './notificationDecision';
import { sendDirectNotification } from './notificationChannels';

export type NotificationSchedulePlatform = 'whatsapp' | 'telegram';

export interface NotificationScheduleConfig {
  enabled: boolean;
  time: string; // HH:mm
  timezone: string; // IANA timezone
  platform: NotificationSchedulePlatform;
  to: string;
  recipientName?: string;
  customMessage?: string;
  userId?: string;
}

const DEFAULT_SCHEDULE: NotificationScheduleConfig = {
  enabled: false,
  time: '07:00',
  timezone: 'Asia/Jakarta',
  platform: 'whatsapp',
  to: '',
  recipientName: 'Petani',
  customMessage: 'Pengingat harian: cek kondisi cuaca dan rencana kerja hari ini.',
};

const scheduleFilePath = path.resolve(process.cwd(), 'data', 'notificationSchedule.json');
let currentTask: ScheduledTask | null = null;

function ensureDataDir() {
  const dir = path.dirname(scheduleFilePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function isValidScheduleTime(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return Boolean(match);
}

function toCronExpression(time: string) {
  const [hour, minute] = time.split(':').map((value) => Number(value));
  return `${minute} ${hour} * * *`;
}

export function getSchedule(): NotificationScheduleConfig {
  ensureDataDir();
  if (!fs.existsSync(scheduleFilePath)) {
    return { ...DEFAULT_SCHEDULE };
  }

  try {
    const raw = fs.readFileSync(scheduleFilePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<NotificationScheduleConfig>;
    return { ...DEFAULT_SCHEDULE, ...parsed };
  } catch {
    return { ...DEFAULT_SCHEDULE };
  }
}

export function saveSchedule(config: NotificationScheduleConfig): NotificationScheduleConfig {
  ensureDataDir();
  const merged = { ...DEFAULT_SCHEDULE, ...config };
  fs.writeFileSync(scheduleFilePath, JSON.stringify(merged, null, 2));
  return merged;
}

async function runScheduledNotification(config: NotificationScheduleConfig) {
  if (!config.enabled || !config.to.trim()) return;

  const dateStr = getDateString(config.timezone || DEFAULT_SCHEDULE.timezone);
  const dailyEvents = config.userId
    ? await fetchDailyEvents(config.userId, dateStr)
    : [];

  const decision = await buildNotificationDecision({
    platform: config.platform,
    to: config.to,
    recipientName: config.recipientName || 'Petani',
    notificationsEnabled: config.enabled,
    weather: {
      kondisi: 'cerah',
      suhu: 0,
      kelembapan: 0,
      curahHujan: 0,
      kecepatanAngin: 0,
      lokasi: 'Kebun Anda',
    },
    metadata: {
      source: 'daily-notification-scheduler',
      customMessage: config.customMessage,
      dailyEvents,
      forceSend: true,
      locale: 'id',
    },
  });

  if (!decision.shouldSend) return;

  await sendDirectNotification(decision.payload);
}

function getDateString(timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

interface CalendarEventRow {
  title: string;
  category?: string;
  waktu?: string | null;
  description?: string | null;
}

async function fetchDailyEvents(userId: string, dateStr: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Scheduler] Supabase env belum diisi, agenda harian tidak dimuat.');
    return [] as Array<{ title: string; time?: string; category?: string; note?: string }>;
  }

  const params = new URLSearchParams({
    select: 'title,category,waktu,description',
    date: `eq.${dateStr}`,
    user_id: `eq.${userId}`,
    order: 'waktu.asc',
  });

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/calendar_events?${params.toString()}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Scheduler] Gagal mengambil agenda harian: ${response.status} ${errorText}`);
      return [] as Array<{ title: string; time?: string; category?: string; note?: string }>;
    }

    const rows = (await response.json()) as CalendarEventRow[];
    return rows.map((row) => ({
      title: row.title,
      time: row.waktu || undefined,
      category: row.category || undefined,
      note: row.description || undefined,
    }));
  } catch (error) {
    console.warn('[Scheduler] Error fetch agenda harian:', error);
    return [] as Array<{ title: string; time?: string; category?: string; note?: string }>;
  }
}

function stopCurrentTask() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}

export function reschedule(config: NotificationScheduleConfig) {
  stopCurrentTask();

  if (!config.enabled || !isValidScheduleTime(config.time)) {
    return;
  }

  const cronExpression = toCronExpression(config.time);
  currentTask = cron.schedule(
    cronExpression,
    () => {
      runScheduledNotification(config).catch((error) => {
        console.error('[Notification Scheduler Error]', error);
      });
    },
    {
      timezone: config.timezone || DEFAULT_SCHEDULE.timezone,
    }
  );
}

export function startScheduler() {
  const schedule = getSchedule();
  reschedule(schedule);
}
