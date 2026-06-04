import { NextResponse } from 'next/server';

import { formatTelegramContact, normalizeTelegramContact, normalizeWhatsAppPhone } from '@/lib/profileContact';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

const PROFILE_SELECT = [
  'id',
  'full_name',
  'whatsapp_phone',
  'telegram_username',
  'telegram_chat_id',
].join(',');

interface ProfileRow {
  id: string;
  full_name?: string | null;
  whatsapp_phone?: string | null;
  telegram_username?: string | null;
  telegram_chat_id?: string | null;
}

type ProfilePayload = Record<string, unknown>;

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasOwn(payload: ProfilePayload, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function cleanNullable(value: unknown) {
  const text = readString(value);
  return text || null;
}

function mapProfile(row: ProfileRow) {
  const telegramContact = formatTelegramContact(row.telegram_username, row.telegram_chat_id);

  return {
    id: row.id,
    fullName: row.full_name ?? '',
    lokasi: '',
    komoditas: '',
    luasLahan: '',
    whatsappPhone: row.whatsapp_phone ?? '',
    telegramUsername: row.telegram_username ?? '',
    telegramChatId: row.telegram_chat_id ?? '',
    telegramContact,
  };
}

async function getAuthorizedUserId(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return {
      response: jsonNoStore({ success: false, message: 'Unauthorized' }, { status: 401 }),
      userId: null,
    };
  }

  return { response: null, userId };
}

function buildProfileUpdate(payload: ProfilePayload) {
  const update: Record<string, string | null> = {};

  if (hasOwn(payload, 'fullName')) update.full_name = cleanNullable(payload.fullName);
  if (hasOwn(payload, 'whatsappPhone')) {
    const phone = normalizeWhatsAppPhone(readString(payload.whatsappPhone));
    update.whatsapp_phone = phone || null;
  }

  if (hasOwn(payload, 'telegramContact')) {
    const telegram = normalizeTelegramContact(readString(payload.telegramContact));
    update.telegram_username = telegram.telegramUsername || null;
    update.telegram_chat_id = telegram.telegramChatId || null;
  }

  return update;
}

function getInsertFallbackName(payload: ProfilePayload) {
  return cleanNullable(payload.fullName) ?? 'Petani';
}

function statusFromSupabaseError(error: { code?: string } | null | undefined) {
  if (error?.code === '23505') return 409;
  return 500;
}

function messageFromSupabaseError(error: { code?: string; message?: string } | null | undefined) {
  if (error?.code === '23505') {
    return 'Nomor WhatsApp atau Telegram sudah dipakai profil lain.';
  }

  return error?.message || 'Gagal menyimpan profil';
}

export async function handleProfileGet(request: Request) {
  try {
    const auth = await getAuthorizedUserId(request);
    if (auth.response) return auth.response;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', auth.userId)
      .maybeSingle();

    if (error) throw error;

    return jsonNoStore({
      success: true,
      data: mapProfile((data as ProfileRow | null) ?? { id: auth.userId }),
    });
  } catch (error) {
    console.error('[API Profile] GET Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal memuat profil' }, { status: 500 });
  }
}

export async function handleProfilePatch(request: Request) {
  try {
    const auth = await getAuthorizedUserId(request);
    if (auth.response) return auth.response;

    const payload = (await request.json()) as ProfilePayload;
    const update = buildProfileUpdate(payload);
    const supabase = getSupabaseAdmin();

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', auth.userId)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (updateError) {
      return jsonNoStore(
        { success: false, message: messageFromSupabaseError(updateError) },
        { status: statusFromSupabaseError(updateError) },
      );
    }

    if (updatedProfile) {
      return jsonNoStore({ success: true, data: mapProfile(updatedProfile as unknown as ProfileRow) });
    }

    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: auth.userId,
        ...update,
        full_name: update.full_name ?? getInsertFallbackName(payload),
      })
      .select(PROFILE_SELECT)
      .single();

    if (insertError) {
      return jsonNoStore(
        { success: false, message: messageFromSupabaseError(insertError) },
        { status: statusFromSupabaseError(insertError) },
      );
    }

    return jsonNoStore({ success: true, data: mapProfile(insertedProfile as unknown as ProfileRow) });
  } catch (error) {
    console.error('[API Profile] PATCH Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menyimpan profil' }, { status: 500 });
  }
}
