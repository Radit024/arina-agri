import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/server/cron/auth';
import { cleanupOldNews, fetchNewsAndUpsert } from '@/lib/server/news/fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  try {
    const inserted = await fetchNewsAndUpsert();
    const deleted = await cleanupOldNews(30);

    return NextResponse.json({
      success: true,
      message: 'News cron completed',
      inserted,
      deleted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
