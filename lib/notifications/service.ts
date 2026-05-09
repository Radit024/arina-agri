import { createClient } from '@supabase/supabase-js';
import { buildNotificationDecision } from '@/backend/src/services/notificationDecision';
import { sendDirectNotification } from '@/backend/src/services/notificationChannels';

export async function processNotifications() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get current time in HH:mm format (rounded to 10 mins or exact)
  // Since Vercel Cron frequency depends on plan, we check for schedules 
  // that haven't been sent today or are due now.
  
  // For simplicity in this implementation, we fetch all ENABLED schedules.
  // In a real prod app with many users, you'd filter by time.
  const { data: schedules, error } = await supabase
    .from('notification_schedules')
    .select('*')
    .eq('enabled', true);

  if (error || !schedules) {
    console.error('[Notification Service] Error fetching schedules:', error);
    return { success: false, error };
  }

  const results = [];
  const now = new Date();

  for (const schedule of schedules) {
    try {
      // Check if it's time to send (simple HH:mm check)
      const [schedHour, schedMin] = schedule.time.split(':').map(Number);
      
      // Get current time in schedule's timezone
      const localTime = new Intl.DateTimeFormat('en-US', {
        timeZone: schedule.timezone || 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      
      const [currHour, currMin] = localTime.split(':').map(Number);

      // Check if current time matches schedule time (within 15 min window to be safe with cron lag)
      const schedTotalMin = schedHour * 60 + schedMin;
      const currTotalMin = currHour * 60 + currMin;
      const diff = Math.abs(currTotalMin - schedTotalMin);

      // If matches time OR it's a manual trigger/force run
      if (diff <= 15) {
        console.log(`[Notification Service] Sending to user ${schedule.user_id} (${schedule.platform})`);
        
        // 1. Fetch daily events for this user
        const dateStr = now.toISOString().split('T')[0];
        const { data: events } = await supabase
          .from('calendar_events')
          .select('title,category,waktu,description')
          .eq('user_id', schedule.user_id)
          .eq('date', dateStr)
          .order('waktu', { ascending: true });

        const dailyEvents = (events || []).map(e => ({
          title: e.title,
          time: e.waktu || undefined,
          category: e.category || undefined,
          note: e.description || undefined
        }));

        // 2. Build decision (using dummy weather for now as in original backend)
        const decision = await buildNotificationDecision({
          platform: schedule.platform,
          to: schedule.platform === 'whatsapp' ? schedule.recipient_number : schedule.telegram_chat_id,
          recipientName: schedule.recipient_name || 'Petani',
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
            customMessage: schedule.custom_message,
            dailyEvents,
            forceSend: true,
            locale: 'id',
          },
        });

        if (decision.shouldSend) {
          const sendResult = await sendDirectNotification(decision.payload);
          results.push({ user_id: schedule.user_id, success: sendResult.success, error: sendResult.error });
        } else {
          results.push({ user_id: schedule.user_id, skipped: true, reason: decision.reason });
        }
      }
    } catch (err) {
      console.error(`[Notification Service] Error processing user ${schedule.user_id}:`, err);
      results.push({ user_id: schedule.user_id, success: false, error: String(err) });
    }
  }

  return { success: true, processed: results.length, results };
}
