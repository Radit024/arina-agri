import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/server/cron/auth';
import { fetchAndSavePrice } from '@/lib/server/prices/scraper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  try {
    await fetchAndSavePrice();
    return NextResponse.json({ success: true, message: 'Price cron completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
