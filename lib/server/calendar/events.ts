import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { resolveRequestUserId } from '@/lib/server/auth/requestUser';
import { recordEvent } from '@/lib/analytics/recordEvent';
import type { ApiCalendarEvent } from '@/lib/api';

const EVENT_SELECT = 'id,title,date,category,description,created_at,updated_at,completed';
const CATEGORIES = ['pemupukan', 'penyemprotan', 'irigasi', 'pemetikan', 'lainnya'] as const;

type CalendarEventCategory = ApiCalendarEvent['jenis'];

interface CalendarEventRow {
  id: string;
  title: string;
  date: string;
  category: CalendarEventCategory;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarEventPayload {
  id?: unknown;
  judul?: unknown;
  tanggal?: unknown;
  jenis?: unknown;
  waktu?: unknown;
  catatan?: unknown;
  action?: unknown;
}

function mapEvent(row: CalendarEventRow): ApiCalendarEvent {
  return {
    _id: row.id,
    judul: row.title,
    tanggal: row.date,
    jenis: row.category,
    waktu: '',
    catatan: row.description ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isCategory(value: unknown): value is CalendarEventCategory {
  return typeof value === 'string' && CATEGORIES.includes(value as CalendarEventCategory);
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function parseCreatePayload(body: CalendarEventPayload) {
  if (
    typeof body.judul !== 'string' ||
    !body.judul.trim() ||
    typeof body.tanggal !== 'string' ||
    !body.tanggal.trim() ||
    !isCategory(body.jenis)
  ) {
    return null;
  }

  return {
    title: body.judul.trim(),
    date: body.tanggal.trim(),
    category: body.jenis,
    description: readOptionalString(body.catatan) ?? '',
  };
}

function parseUpdatePayload(body: CalendarEventPayload) {
  if (typeof body.id !== 'string' || !body.id.trim()) return null;

  const update: Record<string, string> = {};
  if (typeof body.judul === 'string') update.title = body.judul.trim();
  if (typeof body.tanggal === 'string') update.date = body.tanggal.trim();
  if (isCategory(body.jenis)) update.category = body.jenis;
  if (typeof body.catatan === 'string') update.description = body.catatan;

  return {
    id: body.id.trim(),
    update,
  };
}

function jsonNoStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
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

export async function handleCalendarEventsGet(request: Request) {
  try {
    const auth = await getAuthorizedUserId(request);
    if (auth.response) return auth.response;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('calendar_events')
      .select(EVENT_SELECT)
      .eq('user_id', auth.userId)
      .order('date', { ascending: true });

    if (error) throw error;

    return jsonNoStore({
      success: true,
      data: ((data ?? []) as CalendarEventRow[]).map(mapEvent),
    });
  } catch (error) {
    console.error('[API Calendar Events] GET Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal memuat jadwal' }, { status: 500 });
  }
}

export async function handleCalendarEventsPost(request: Request) {
  try {
    const auth = await getAuthorizedUserId(request);
    if (auth.response) return auth.response;

    const payload = parseCreatePayload(await request.json());
    if (!payload) {
      return jsonNoStore({ success: false, message: 'Payload jadwal tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: auth.userId,
        ...payload,
      })
      .select(EVENT_SELECT)
      .single();

    if (error) throw error;

    await recordEvent({
      userId: auth.userId,
      feature: 'kalender',
      eventType: 'action',
      eventName: 'calendar_event_created',
    });

    return jsonNoStore({ success: true, data: mapEvent(data as CalendarEventRow) });
  } catch (error) {
    console.error('[API Calendar Events] POST Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menyimpan jadwal' }, { status: 500 });
  }
}

export async function handleCalendarEventsPatch(request: Request) {
  try {
    const auth = await getAuthorizedUserId(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const parsed = parseUpdatePayload(body);
    if (!parsed) {
      return jsonNoStore({ success: false, message: 'Payload jadwal tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (body.action === 'toggleComplete') {
      const { data: current, error: fetchError } = await supabase
        .from('calendar_events')
        .select('completed')
        .eq('id', parsed.id)
        .eq('user_id', auth.userId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('calendar_events')
        .update({ completed: !current.completed, updated_at: new Date().toISOString() })
        .eq('id', parsed.id)
        .eq('user_id', auth.userId)
        .select(EVENT_SELECT)
        .single();

      if (error) throw error;

      return jsonNoStore({ success: true, data: mapEvent(data as CalendarEventRow) });
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...parsed.update, updated_at: new Date().toISOString() })
      .eq('id', parsed.id)
      .eq('user_id', auth.userId)
      .select(EVENT_SELECT)
      .single();

    if (error) throw error;

    return jsonNoStore({ success: true, data: mapEvent(data as CalendarEventRow) });
  } catch (error) {
    console.error('[API Calendar Events] PATCH Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal memperbarui jadwal' }, { status: 500 });
  }
}

export async function handleCalendarEventsDelete(request: Request) {
  try {
    const auth = await getAuthorizedUserId(request);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.trim();
    if (!id) {
      return jsonNoStore({ success: false, message: 'ID jadwal tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) throw error;

    return jsonNoStore({ success: true, data: null });
  } catch (error) {
    console.error('[API Calendar Events] DELETE Error:', error);
    return jsonNoStore({ success: false, message: 'Gagal menghapus jadwal' }, { status: 500 });
  }
}
