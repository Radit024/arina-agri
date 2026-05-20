import { NextResponse } from 'next/server';
import { buildNotificationDecision, type NotificationDecisionInput } from '@/lib/server/notifications/decision';

function validateDecisionPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (body.platform !== 'whatsapp' && body.platform !== 'telegram') {
    return { valid: false, message: 'platform harus "whatsapp" atau "telegram".' };
  }

  if (!body.to || typeof body.to !== 'string') {
    return { valid: false, message: 'Field "to" wajib diisi.' };
  }

  if (!body.weather || typeof body.weather !== 'object') {
    return { valid: false, message: 'Field "weather" wajib diisi.' };
  }

  const requiredWeatherFields = ['kondisi', 'suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of requiredWeatherFields) {
    if (body.weather[field] === undefined || body.weather[field] === null) {
      return { valid: false, message: `Field weather.${field} wajib diisi.` };
    }
  }

  const numericWeatherFields = ['suhu', 'kelembapan', 'curahHujan', 'kecepatanAngin'];
  for (const field of numericWeatherFields) {
    const value = Number(body.weather[field]);
    if (!Number.isFinite(value)) {
      return { valid: false, message: `Field weather.${field} harus berupa angka valid.` };
    }
  }

  if (typeof body.weather.kondisi !== 'string' || !body.weather.kondisi.trim()) {
    return { valid: false, message: 'Field weather.kondisi harus berupa teks yang valid.' };
  }

  if (body.metadata?.bmkgWarnings !== undefined && !Array.isArray(body.metadata.bmkgWarnings)) {
    return { valid: false, message: 'metadata.bmkgWarnings harus berupa array.' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateDecisionPayload(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }

    const decision = await buildNotificationDecision(body as NotificationDecisionInput);

    return NextResponse.json({
      success: true,
      message: 'Decision generated successfully',
      data: decision,
    });
  } catch (error) {
    console.error('[Notification Decide Error]', error);
    return NextResponse.json({ success: false, message: 'Gagal menghasilkan keputusan notifikasi.' }, { status: 500 });
  }
}
