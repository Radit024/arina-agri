import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processInboundChatMessage: vi.fn(),
}));

vi.mock('@/lib/server/chat-input/processor', () => ({
  processInboundChatMessage: mocks.processInboundChatMessage,
}));

describe('/api/webhook/telegram', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret-token';
    mocks.processInboundChatMessage.mockResolvedValue({
      success: true,
      status: 'processed',
      replyText: 'ok',
    });
  });

  it('rejects requests with an invalid secret token', async () => {
    const { POST } = await import('@/app/api/webhook/telegram/route');
    const response = await POST(
      new Request('http://localhost/api/webhook/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret' },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(401);
  });

  it('accepts requests with the correct secret token', async () => {
    const { POST } = await import('@/app/api/webhook/telegram/route');
    const response = await POST(
      new Request('http://localhost/api/webhook/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret-token' },
        body: JSON.stringify({
          update_id: 100,
          message: {
            message_id: 200,
            date: 1780454400,
            text: 'pengeluaran 50000 pupuk',
            chat: { id: 123456 },
            from: { id: 123456, username: 'petani' },
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it('maps Telegram payload fields to the shared inbound message format', async () => {
    const { POST } = await import('@/app/api/webhook/telegram/route');
    await POST(
      new Request('http://localhost/api/webhook/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret-token' },
        body: JSON.stringify({
          update_id: 100,
          message: {
            message_id: 200,
            date: 1780454400,
            text: 'pengeluaran 50000 pupuk',
            chat: { id: 123456, first_name: 'Budi' },
            from: { id: 123456, username: 'petanimaju' },
          },
        }),
      }),
    );

    expect(mocks.processInboundChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'telegram',
        externalMessageId: '100:200',
        senderId: '123456',
        replyTo: '123456',
        text: 'pengeluaran 50000 pupuk',
        senderDisplayName: 'petanimaju',
      }),
    );
  });

  it('silently acknowledges non-text updates (no processor call)', async () => {
    const { POST } = await import('@/app/api/webhook/telegram/route');
    const response = await POST(
      new Request('http://localhost/api/webhook/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret-token' },
        body: JSON.stringify({ update_id: 101, message: { message_id: 201, chat: { id: 123456 } } }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.processInboundChatMessage).not.toHaveBeenCalled();
  });
});
