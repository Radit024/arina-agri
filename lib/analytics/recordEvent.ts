import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

export type AnalyticsFeature = 'keuangan' | 'stok' | 'kalender' | 'ai_chat';
export type AnalyticsEventType = 'page_view' | 'action';

export interface RecordEventInput {
  userId: string | null;
  feature: AnalyticsFeature;
  eventType: AnalyticsEventType;
  eventName: string;
  metadata?: Record<string, unknown>;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('usage_events').insert({
      user_id: input.userId,
      feature: input.feature,
      event_type: input.eventType,
      event_name: input.eventName,
      metadata: input.metadata ?? null,
    });

    if (error) {
      console.error('[recordEvent] Gagal mencatat usage event:', error.message);
    }
  } catch (error) {
    console.error('[recordEvent] Gagal mencatat usage event:', error);
  }
}
