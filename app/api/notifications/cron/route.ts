import { NextResponse } from 'next/server';
import { processNotifications } from '@/lib/notifications/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Security check for Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await processNotifications();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API Notifications Cron] Error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
