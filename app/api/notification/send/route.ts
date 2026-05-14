import { NextResponse } from 'next/server';
import { sendDirectNotification } from '@/lib/server/notifications/channels';

function validateSendPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, message: 'Field "message" wajib diisi.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSendPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const result = await sendDirectNotification({
      platform: body.platform,
      to: body.to,
      message: body.message,
      metadata: body.metadata,
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