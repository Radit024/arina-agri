import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processInboundChatMessage: vi.fn(),
}));

vi.mock('@/lib/server/chat-input/processor', () => ({
  processInboundChatMessage: mocks.processInboundChatMessage,
}));

function signBody(body: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

const WA_BODY = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: 'Budi' }, wa_id: '628123456789' }],
            messages: [
              {
                id: 'wamid.abc123',
                from: '628123456789',
                timestamp: '1780454400',
                type: 'text',
                text: { body: 'pemasukan 750000 penjualan cabai' },
              },
            ],
          },
        },
      ],
    },
  ],
});

describe('/api/webhook/whatsapp', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-token';
    process.env.WHATSAPP_APP_SECRET = 'app-secret';
    mocks.processInboundChatMessage.mockResolvedValue({
      success: true,
      status: 'processed',
      replyText: 'ok',
    });
  });

  // ── GET: verification handshake ─────────────────────────────────────────────

  it('returns the hub challenge for a valid verification token', async () => {
    const { GET } = await import('@/app/api/webhook/whatsapp/route');
    const response = await GET(
      new Request(
        'http://localhost/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=abc123',
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('abc123');
  });

  it('returns 403 for an invalid verify token', async () => {
    const { GET } = await import('@/app/api/webhook/whatsapp/route');
    const response = await GET(
      new Request(
        'http://localhost/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123',
      ),
    );
    expect(response.status).toBe(403);
  });

  // ── POST: incoming messages ─────────────────────────────────────────────────

  it('returns 401 for an invalid HMAC signature', async () => {
    const { POST } = await import('@/app/api/webhook/whatsapp/route');
    const response = await POST(
      new Request('http://localhost/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'x-hub-signature-256': 'sha256=badhash' },
        body: WA_BODY,
      }),
    );
    expect(response.status).toBe(401);
  });

  it('accepts a correctly signed message and calls the processor', async () => {
    const { POST } = await import('@/app/api/webhook/whatsapp/route');
    const response = await POST(
      new Request('http://localhost/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'x-hub-signature-256': signBody(WA_BODY, 'app-secret') },
        body: WA_BODY,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.processInboundChatMessage).toHaveBeenCalledTimes(1);
  });

  it('maps WhatsApp payload fields to the shared inbound message format', async () => {
    const { POST } = await import('@/app/api/webhook/whatsapp/route');
    await POST(
      new Request('http://localhost/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'x-hub-signature-256': signBody(WA_BODY, 'app-secret') },
        body: WA_BODY,
      }),
    );
    expect(mocks.processInboundChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'whatsapp',
        externalMessageId: 'wamid.abc123',
        senderId: '628123456789',
        replyTo: '628123456789',
        text: 'pemasukan 750000 penjualan cabai',
        senderDisplayName: 'Budi',
      }),
    );
  });

  it('skips non-text message types silently', async () => {
    const imageBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ id: 'img-1', from: '628999', timestamp: '1780454400', type: 'image' }],
              },
            },
          ],
        },
      ],
    });

    const { POST } = await import('@/app/api/webhook/whatsapp/route');
    const response = await POST(
      new Request('http://localhost/api/webhook/whatsapp', {
        method: 'POST',
        headers: { 'x-hub-signature-256': signBody(imageBody, 'app-secret') },
        body: imageBody,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.processInboundChatMessage).not.toHaveBeenCalled();
  });
});
