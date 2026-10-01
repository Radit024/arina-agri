import { NextResponse } from 'next/server';
import { buildNotificationDecision, type NotificationDecisionInput } from '@/lib/server/notifications/decision';
import { sendDirectNotification } from '@/lib/server/notifications/channels';
import { guardRequest } from '@/lib/server/guards/requestGuard';

export const dynamic = 'force-dynamic';

/** Batas keras ukuran body: memuat object weather + metadata bmkgWarnings. */
const MAX_BODY_BYTES = 8_192;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function validateDecisionPayload(body: unknown): { valid: boolean; message?: string } {
  if (!isRecord(body)) {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (!isRecord(body.weather)) {
    return { valid: false, message: 'Field "weather" wajib diisi.' };
  }

  const requiredWeatherFields = ['kondisi', 'suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  const weather = body.weather;
  for (const field of requiredWeatherFields) {
    if (weather[field] === undefined || weather[field] === null) {
      return { valid: false, message: `Field weather.${field} wajib diisi.` };
    }
  }

  const numericWeatherFields = ['suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of numericWeatherFields) {
    const value = Number(weather[field]);
    if (!Number.isFinite(value)) {
      return { valid: false, message: `Field weather.${field} harus berupa angka valid.` };
    }
  }

  if (typeof weather.kondisi !== 'string' || !weather.kondisi.trim()) {
    return { valid: false, message: 'Field weather.kondisi harus berupa teks yang valid.' };
  }

  const metadata = body.metadata;
  if (isRecord(metadata) && metadata.bmkgWarnings !== undefined && !Array.isArray(metadata.bmkgWarnings)) {
    return { valid: false, message: 'metadata.bmkgWarnings harus berupa array.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const guarded = await guardRequest(request, { requireAuth: true, maxBodyBytes: MAX_BODY_BYTES });
    if ('response' in guarded) return guarded.response;

    const body = guarded.context.body;
    const validation = validateDecisionPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const decision = await buildNotificationDecision(body as NotificationDecisionInput);

    if (!decision.shouldSend) {
      return NextResponse.json({
        success: true,
        message: 'Notifikasi tidak dikirim karena kondisi belum memenuhi aturan.',
        data: {
          sent: false,
          decision,
        },
      });
    }

    const sendResult = await sendDirectNotification(decision.payload);
    if (!sendResult.success) {
      return NextResponse.json({
        success: false,
        message: sendResult.error || 'Gagal meneruskan notifikasi ke channel tujuan.',
        data: {
          sent: false,
          decision,
        },
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Keputusan berhasil dibuat dan notifikasi diteruskan ke channel tujuan.',
      data: {
        sent: true,
        decision,
        channel: sendResult.data,
      },
    });
  } catch (error) {
    console.error('[Notification DecideSend Error]', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses notifikasi berbasis AI decision system.' }, { status: 500 });
  }
}
