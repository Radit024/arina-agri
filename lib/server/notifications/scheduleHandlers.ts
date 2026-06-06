import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { validateSchedulePayload, NotificationScheduleRow } from './schedule';

function mapScheduleRow(row: NotificationScheduleRow) {
  const to = row.platform === 'whatsapp'
    ? row.recipient_number || ''
    : row.telegram_chat_id || '';

  return {
    enabled: Boolean(row.enabled),
    time: row.time,
    timezone: row.timezone || 'Asia/Jakarta',
    platform: row.platform,
    to,
    recipientName: row.recipient_name || 'Petani',
    customMessage: row.custom_message || '',
    weatherAdm4: row.weather_adm4 || '',
    weatherLocationLabel: row.weather_location_label || '',
    userId: row.user_id,
  };
}

export async function handleScheduleGet(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notification_schedules')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          time: '07:00',
          timezone: 'Asia/Jakarta',
          platform: 'telegram',
          to: '',
          recipientName: 'Petani',
          customMessage: '',
          weatherAdm4: '',
          weatherLocationLabel: '',
          userId,
        },
      });
    }

    return NextResponse.json({ success: true, data: mapScheduleRow(data as NotificationScheduleRow) });
  } catch (err) {
    console.error('[API Schedule] Error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleSchedulePost(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateSchedulePayload(body);
    if (!validation.valid || !validation.payload) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const payload = validation.payload;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('notification_schedules')
      .upsert({
        user_id: userId,
        enabled: payload.enabled,
        time: payload.time,
        timezone: payload.timezone || 'Asia/Jakarta',
        platform: payload.platform,
        recipient_number: payload.platform === 'whatsapp' ? (payload.to || null) : null,
        telegram_chat_id: payload.platform === 'telegram' ? (payload.to || null) : null,
        recipient_name: payload.recipientName || 'Petani',
        custom_message: payload.customMessage || null,
        weather_adm4: payload.weatherAdm4 || null,
        weather_location_label: payload.weatherLocationLabel || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: mapScheduleRow(data as NotificationScheduleRow) });
  } catch (err) {
    console.error('[API Schedule] POST Error:', err);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan jadwal' }, { status: 500 });
  }
}
