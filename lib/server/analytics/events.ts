import { NextResponse } from 'next/server';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent, type AnalyticsFeature } from '@/lib/analytics/recordEvent';

const FEATURES: AnalyticsFeature[] = ['keuangan', 'stok', 'kalender', 'ai_chat'];

interface PageViewPayload {
  feature?: unknown;
}

function isAnalyticsFeature(value: unknown): value is AnalyticsFeature {
  return typeof value === 'string' && FEATURES.includes(value as AnalyticsFeature);
}

export async function handleAnalyticsEventCreate(request: Request) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PageViewPayload;
    if (!isAnalyticsFeature(body.feature)) {
      return NextResponse.json({ success: false, message: 'Feature tidak valid' }, { status: 400 });
    }

    await recordEvent({
      userId,
      feature: body.feature,
      eventType: 'page_view',
      eventName: 'page_view',
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API Analytics Events] POST Error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mencatat event' }, { status: 500 });
  }
}
