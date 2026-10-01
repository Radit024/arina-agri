import { NextResponse } from 'next/server';
import { sendDirectNotification } from '@/lib/server/notifications/channels';
import { guardRequest } from '@/lib/server/guards/requestGuard';

export const dynamic = 'force-dynamic';

/** Batas keras ukuran body: pesan Telegram/WhatsApp tidak perlu besar. */
const MAX_BODY_BYTES = 4_096;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function validateSendPayload(body: unknown): { valid: boolean; message?: string } {
  if (!isRecord(body)) {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (body.to.length > 128) {
    return { valid: false, message: 'Field "to" maksimal 128 karakter.' };
  }

  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, message: 'Field "message" wajib diisi.' };
  }

  if (body.message.length > 4_096) {
    return { valid: false, message: 'Field "message" maksimal 4096 karakter.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const guarded = await guardRequest(request, { requireAuth: true, maxBodyBytes: MAX_BODY_BYTES });
    if ('response' in guarded) return guarded.response;

    const body = guarded.context.body;
    const validation = validateSendPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const payload = body as {
      platform: 'whatsapp' | 'telegram';
      to: string;
      message: string;
      metadata?: Record<string, unknown>;
    };

    const result = await sendDirectNotification({
      platform: payload.platform,
      to: payload.to,
      message: payload.message,
      metadata: payload.metadata,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully via backend channel',
      data: result.data,
    });
  } catch (error) {
    console.error('[Notification Route Error]', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
