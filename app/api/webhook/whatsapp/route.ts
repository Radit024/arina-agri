import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { processInboundChatMessage } from '@/lib/server/chat-input/processor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface WhatsAppContact {
  wa_id: string;
  profile?: {
    name?: string;
  };
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
}

interface WhatsAppWebhookChange {
  value?: {
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
  };
}

interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: WhatsAppWebhookChange[];
  }>;
}


function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Fail-closed: tanpa app secret, tandatangan tidak bisa diverifikasi dan
  // request harus ditolak di setiap environment.
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    // Buffers of different lengths throw — treat as invalid.
    return false;
  }
}


export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
}


export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WhatsAppWebhookBody;
  const changes = (body.entry ?? []).flatMap((entry) => entry.changes ?? []);
  const results = [];

  for (const change of changes) {
    const value = change.value ?? {};
    // Build a map from wa_id to contact display name for lookup during message processing.
    const contactNameByWaId = new Map<string, string>(
      (value.contacts ?? []).map((contact) => [contact.wa_id, contact.profile?.name ?? '']),
    );

    for (const message of value.messages ?? []) {
      // Only handle text messages; ignore read receipts, delivery reports, etc.
      if (message.type !== 'text' || !message.text?.body || !message.from) continue;

      const result = await processInboundChatMessage({
        channel: 'whatsapp',
        externalMessageId: message.id,
        senderId: message.from,
        senderDisplayName: contactNameByWaId.get(message.from),
        text: message.text.body,
        receivedAt: new Date(
          Number(message.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
        ).toISOString(),
        replyTo: message.from,
      });

      results.push(result);
    }
  }

  return NextResponse.json({ success: true, data: results });
}
