import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/server/cron/auth';
import { fetchNewsAndUpsert } from '@/lib/server/news/fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Pemicu manual fetch berita. Endpoint ini menjalankan fetch + scrape, jadi
 * memakai CRON_SECRET yang sama dengan `/api/cron/news` agar tidak bisa
 * dipicu publik.
 */
export async function POST(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  try {
    const inserted = await fetchNewsAndUpsert();
    return NextResponse.json({
      success: true,
      message: 'Fetch berita selesai dilakukan',
      inserted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
