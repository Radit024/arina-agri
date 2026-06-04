import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatInputChannel, ResolvedChatUser } from './types';
import {
  normalizeTelegramUsername as normalizeStoredTelegramUsername,
  normalizeWhatsAppPhone as normalizeStoredWhatsAppPhone,
} from '@/lib/profileContact';

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Normalises a WhatsApp phone number to E.164 format (Indonesian prefix).
 * "08123456789" → "628123456789"
 */
function normalizeWhatsAppPhone(input: string): string {
  return normalizeStoredWhatsAppPhone(input);
}

/**
 * Strips leading "@" from Telegram usernames for consistent storage.
 * "@petanimaju" → "petanimaju"
 */
function normalizeTelegramUsername(input: string): string {
  return normalizeStoredTelegramUsername(input);
}

// ─── Identity Resolution ──────────────────────────────────────────────────────

/**
 * Resolves a Telegram or WhatsApp sender to an Arina Agri user profile.
 *
 * For Telegram: tries to match by `telegram_chat_id` (numeric ID) first.
 * If not found, falls back to `telegram_username` (username the user stored
 * in their settings). When a username match succeeds, the Chat ID is written
 * back to the profile so future lookups are instant.
 *
 * For WhatsApp: matches by normalised E.164 phone number stored in `whatsapp_phone`.
 *
 * Returns `null` when no matching profile is found.
 */
export async function resolveChatUser(
  supabase: SupabaseClient,
  channel: ChatInputChannel,
  senderId: string,
  senderUsername?: string,
): Promise<ResolvedChatUser | null> {
  if (channel === 'whatsapp') {
    const phone = normalizeWhatsAppPhone(senderId);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email')
      .eq('whatsapp_phone', phone)
      .single();

    if (error || !data) return null;
    return { id: data.id, displayName: data.full_name || data.email || 'Petani' };
  }

  // ── Telegram: try Chat ID first (numeric) ─────────────────────────────────
  const chatIdStr = senderId.trim();
  
  // We check if the chat ID is stored in either `telegram_chat_id` OR mistakenly saved in `telegram_username`
  const { data: byId, error: idError } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .or(`telegram_chat_id.eq.${chatIdStr},telegram_username.eq.${chatIdStr}`)
    .single();

  if (!idError && byId) {
    // If it was mistakenly saved in username, auto-migrate it to the correct column
    await supabase
      .from('profiles')
      .update({ telegram_chat_id: chatIdStr })
      .eq('id', byId.id);

    return { id: byId.id, displayName: byId.full_name || byId.email || 'Petani' };
  }

  // ── Telegram: fall back to username ──────────────────────────────────────
  if (!senderUsername) return null;

  const username = normalizeTelegramUsername(senderUsername);
  const { data: byUsername, error: usernameError } = await supabase
    .from('profiles')
    .select('id,full_name,email')
    .eq('telegram_username', username)
    .single();

  if (usernameError || !byUsername) return null;

  // Auto-save the numeric Chat ID to avoid username lookups in future messages.
  await supabase
    .from('profiles')
    .update({ telegram_chat_id: chatIdStr })
    .eq('id', byUsername.id);

  return {
    id: byUsername.id,
    displayName: byUsername.full_name || byUsername.email || 'Petani',
  };
}
