import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { sendDirectNotification } from '@/lib/server/notifications/channels';
import { resolveChatUser } from './identity';
import { parseChatInput } from './parser';
import { recordFinanceCommand, recordStockInCommand, recordStockOutCommand } from './records';
import type { InboundChatMessage, ProcessChatInputResult } from './types';

// ─── Reply Helper ─────────────────────────────────────────────────────────────

async function sendReply(message: InboundChatMessage, text: string): Promise<void> {
  await sendDirectNotification({
    platform: message.channel,
    to: message.replyTo,
    message: text,
    metadata: {
      source: 'chat-input',
      externalMessageId: message.externalMessageId,
    },
  });
}

// ─── Processor ────────────────────────────────────────────────────────────────

/**
 * Orchestrates the full lifecycle of an inbound chat message:
 * 1. Resolve sender identity → reject unknown senders with instructions.
 * 2. Log the message for idempotency (unique constraint on channel + message_id).
 * 3. Parse the command → reply with help text if invalid.
 * 4. Write the record to the database.
 * 5. Update the log with the result and send a confirmation reply.
 */
export async function processInboundChatMessage(
  message: InboundChatMessage,
): Promise<ProcessChatInputResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date(message.receivedAt);

  // ── 1. Identity resolution ─────────────────────────────────────────────────
  const user = await resolveChatUser(
    supabase,
    message.channel,
    message.senderId,
    message.senderDisplayName,
  );

  if (!user) {
    const platform = message.channel === 'telegram' ? 'Telegram' : 'WhatsApp';
    const replyText =
      `Akun ${platform} ini belum terhubung ke Arina Agri. ` +
      `Silakan masukkan ${platform === 'Telegram' ? 'username Telegram' : 'nomor WhatsApp'} ` +
      `Anda di halaman Pengaturan → Profil pada aplikasi Arina Agri.`;

    await sendReply(message, replyText);
    return { success: true, status: 'ignored', replyText };
  }

  // ── 2. Idempotency log ─────────────────────────────────────────────────────
  // Log is inserted before parsing so that even invalid messages are deduplicated.
  const { data: logRow, error: logError } = await supabase
    .from('inbound_message_logs')
    .insert({
      channel: message.channel,
      external_message_id: message.externalMessageId,
      user_id: user.id,
      sender_id: message.senderId,
      raw_text: message.text,
      status: 'received',
    })
    .select()
    .single();

  // A unique constraint violation means we already processed this message.
  if (logError) {
    const duplicateText = 'Pesan ini sudah pernah diproses.';
    await sendReply(message, duplicateText);
    return { success: true, status: 'ignored', replyText: duplicateText };
  }

  // ── 3. Parse command ───────────────────────────────────────────────────────
  const parsed = parseChatInput(message.text);

  if (!parsed.ok) {
    await supabase
      .from('inbound_message_logs')
      .update({ status: 'ignored', response_text: parsed.message, processed_at: now.toISOString() })
      .eq('id', (logRow as any).id);

    await sendReply(message, parsed.message);
    return { success: true, status: 'ignored', replyText: parsed.message };
  }

  // ── 4. Write record ────────────────────────────────────────────────────────
  try {
    const result =
      parsed.command.type === 'finance'
        ? await recordFinanceCommand(supabase, user.id, parsed.command, now)
        : parsed.command.type === 'stock_in'
          ? await recordStockInCommand(supabase, user.id, parsed.command, now)
          : await recordStockOutCommand(supabase, user.id, parsed.command, now);

    // ── 5. Update log + confirm ──────────────────────────────────────────────
    await supabase
      .from('inbound_message_logs')
      .update({
        command_type: parsed.command.type,
        status: 'processed',
        response_text: result.summary,
        processed_at: now.toISOString(),
      })
      .eq('id', (logRow as any).id);

    await sendReply(message, result.summary);
    return { success: true, status: 'processed', replyText: result.summary };
  } catch (err) {
    const replyText = err instanceof Error ? err.message : 'Gagal memproses pesan.';

    await supabase
      .from('inbound_message_logs')
      .update({
        command_type: parsed.command.type,
        status: 'failed',
        error_message: replyText,
        response_text: replyText,
        processed_at: now.toISOString(),
      })
      .eq('id', (logRow as any).id);

    await sendReply(message, `❌ ${replyText}`);
    return { success: false, status: 'failed', replyText };
  }
}
