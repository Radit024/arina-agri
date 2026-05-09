import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function resolveUserId(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_schedules')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || { enabled: false, time: '07:00', platform: 'telegram' }
    });
  } catch (err) {
    console.error('[API Schedule] Error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { data, error } = await supabase
      .from('notification_schedules')
      .upsert({
        user_id: user.id,
        enabled: body.enabled,
        time: body.time,
        platform: body.platform,
        telegram_chat_id: body.to, // in frontend 'to' is used for both
        recipient_number: body.to, // simplified
        recipient_name: body.recipientName,
        custom_message: body.customMessage,
        timezone: body.timezone || 'Asia/Jakarta',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[API Schedule] POST Error:', err);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan jadwal' }, { status: 500 });
  }
}
