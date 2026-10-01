import { NextResponse } from 'next/server';
import { processInboundChatMessage } from '@/lib/server/chat-input/processor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actualSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  // Fail-closed: secret yang belum dikonfigurasi berarti webhook tidak bisa
  // diautentikasi, jadi menolak semua request.
  if (!expectedSecret || actualSecret !== expectedSecret) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Handle both new messages and edited messages.
  const message = body.message ?? body.edited_message;
  if (!message?.text || !message?.chat?.id) {
    // Non-text updates (stickers, photos, etc.) are silently acknowledged.
    return NextResponse.json({ success: true, message: 'Ignored non-text update' });
  }

  const result = await processInboundChatMessage({
    channel: 'telegram',
    // Compound ID: update_id ensures global uniqueness; message_id is local per chat.
    externalMessageId: `${body.update_id}:${message.message_id}`,
    senderId: String(message.chat.id),
    senderDisplayName: message.from?.username ?? message.from?.first_name,
    text: message.text,
    receivedAt: new Date(Number(message.date ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    replyTo: String(message.chat.id),
  });

  return NextResponse.json({ success: true, data: result });
}
