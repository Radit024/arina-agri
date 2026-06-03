import { NextResponse } from 'next/server';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { z } from 'zod';

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'question']),
  message: z.string().min(5),
  device_type: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    const userName = user?.user_metadata?.full_name || user?.email || 'Pengguna Anonim';

    const { error: insertError } = await supabase
      .from('user_feedbacks')
      .insert({
        user_id: userId,
        category: validatedData.category,
        message: validatedData.message,
        user_name: userName,
        device_type: validatedData.device_type || 'unknown',
      });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_feedbacks')
      .select('id, category, message, created_at, user_name, device_type')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Feedback API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
