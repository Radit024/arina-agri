import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { buildNotificationDecision } from './decision';
import { sendDirectNotification } from './channels';
import { isScheduleDue, NotificationScheduleRow } from './schedule';

export async function processScheduledNotifications(forceAll: boolean = false) {
  const supabase = getSupabaseAdmin();

  const { data: schedules, error } = await supabase
    .from('notification_schedules')
    .select('*')
    .eq('enabled', true);

  if (error || !schedules) {
    console.error('[Notification Service] Error fetching schedules:', error);
    return { success: false, error };
  }

  const results: Array<Record<string, unknown>> = [];
  const now = new Date();

  for (const raw of schedules as NotificationScheduleRow[]) {
    try {
      if (!forceAll && !isScheduleDue(raw, now)) {
        continue;
      }

      const to = raw.platform === 'whatsapp'
        ? raw.recipient_number || raw.telegram_chat_id || ''
        : raw.telegram_chat_id || raw.recipient_number || '';

      if (!to) {
        results.push({ user_id: raw.user_id, success: false, error: 'Recipient tidak ditemukan.' });
        continue;
      }

      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: raw.timezone || 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);

      const { data: events } = await supabase
        .from('calendar_events')
        .select('title,category,waktu,description')
        .eq('user_id', raw.user_id)
        .eq('date', dateStr)
        .order('waktu', { ascending: true });

      const dailyEvents = (events || []).map((e) => ({
        title: e.title,
        time: e.waktu || undefined,
        category: e.category || undefined,
        note: e.description || undefined,
      }));

      const decision = await buildNotificationDecision({
        platform: raw.platform,
        to,
        recipientName: raw.recipient_name || 'Petani',
        notificationsEnabled: true,
        weather: {
          kondisi: 'cerah',
          suhu: 28,
          kelembapan: 75,
          curahHujan: 0,
          kecepatanAngin: 5,
          lokasi: 'Kebun Anda',
        },
        metadata: {
          source: 'vercel-cron-scheduler',
          customMessage: raw.custom_message || undefined,
          dailyEvents,
          forceSend: true,
          locale: 'id',
        },
      });

      if (decision.shouldSend) {
        const sendResult = await sendDirectNotification(decision.payload);
        results.push({ user_id: raw.user_id, success: sendResult.success, error: sendResult.error });

        if (sendResult.success) {
          await supabase
            .from('notification_schedules')
            .update({ last_sent_at: now.toISOString() })
            .eq('id', raw.id);
        }
      } else {
        results.push({ user_id: raw.user_id, skipped: true, reason: decision.reason });
      }
    } catch (err) {
      console.error(`[Notification Service] Error processing user ${raw.user_id}:`, err);
      results.push({ user_id: raw.user_id, success: false, error: String(err) });
    }
  }

  return { success: true, processed: results.length, results };
}