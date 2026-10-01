import { NextResponse } from 'next/server';
import { generateFinancialAnalysis } from '@/lib/server/ai/gemini';
import { validateFinancialReportPayload } from '@/lib/server/ai/validators';
import { guardRequest } from '@/lib/server/guards/requestGuard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 2_000_000;

export async function POST(request: Request) {
  try {
    const guarded = await guardRequest(request, {
      requireAuth: true,
      maxBodyBytes: MAX_BODY_BYTES,
    });
    if ('response' in guarded) return guarded.response;

    const body = guarded.context.body;
    const validation = validateFinancialReportPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const analysis = await generateFinancialAnalysis({
      reportData: body as Parameters<typeof generateFinancialAnalysis>[0]['reportData'],
    });

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: { analysis, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memanggil Gemini.';
    console.error('[Gemini Error]', message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
