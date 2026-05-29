import { NextResponse } from 'next/server';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { getDashboardSummary } from '@/lib/server/dashboard/summary';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const url = new URL(request.url);
    const adm4 = url.searchParams.get('adm4')?.trim() || undefined;
    const locationLabel = url.searchParams.get('locationLabel')?.trim() || undefined;
    const data = await getDashboardSummary({ userId, adm4, locationLabel });

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[API Dashboard Summary] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat ringkasan dashboard' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
