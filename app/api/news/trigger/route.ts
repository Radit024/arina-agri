import { NextResponse } from 'next/server';
import { fetchNewsAndUpsert } from '@/lib/server/news/fetch';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const inserted = await fetchNewsAndUpsert();
    return NextResponse.json({
      success: true,
      message: 'Fetch berita selesai dilakukan',
      inserted,
    });
  } catch (err) {
    const message = (err as any)?.message || 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
