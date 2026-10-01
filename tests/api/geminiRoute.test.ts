import { describe, expect, it, vi, beforeEach } from 'vitest';

const resolveRequestUserId = vi.fn();
const recordEvent = vi.fn();
const generateGeminiReply = vi.fn();
const from = vi.fn();

vi.mock('@/lib/server/auth/requestUser', () => ({
  resolveRequestUserId: (request: Request) => resolveRequestUserId(request),
}));

vi.mock('@/lib/analytics/recordEvent', () => ({
  recordEvent: (input: unknown) => recordEvent(input),
}));

vi.mock('@/lib/server/ai/gemini', () => ({
  generateGeminiReply: (input: unknown) => generateGeminiReply(input),
}));

vi.mock('@/lib/server/ai/validators', () => ({
  validateGeminiPayload: (body: unknown) => {
    const b = body as { prompt?: unknown };
    if (typeof b.prompt !== 'string' || !b.prompt.trim()) {
      return { valid: false, message: 'Prompt wajib diisi' };
    }
    return { valid: true };
  },
}));

vi.mock('@/lib/server/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({ from }),
}));

describe('gemini route', () => {
  beforeEach(() => {
    resolveRequestUserId.mockReset();
    recordEvent.mockReset();
    generateGeminiReply.mockReset();
    from.mockReset();
  });

  it('records a chat_message_sent event with the resolved user id on success', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    generateGeminiReply.mockResolvedValue('Balasan AI');
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ prompt: 'Kapan waktu tanam cabai?' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.reply).toBe('Balasan AI');
    expect(recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      feature: 'ai_chat',
      eventType: 'action',
      eventName: 'chat_message_sent',
    });
  });

  it('rejects a guest (no resolvable user id) before calling Gemini', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Halo' }),
    }));

    expect(response.status).toBe(401);
    expect(generateGeminiReply).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('still returns the AI reply when recording analytics fails', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    generateGeminiReply.mockResolvedValue('Balasan AI meski analytics gagal');
    recordEvent.mockRejectedValue(new Error('analytics down'));
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ prompt: 'Kapan waktu tanam cabai?' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.reply).toBe('Balasan AI meski analytics gagal');
  });

  it('rejects a body larger than the hard limit without parsing it', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/ai/gemini/route');

    const oversized = JSON.stringify({ prompt: 'x'.repeat(60_000) });
    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: oversized,
    }));

    expect(response.status).toBe(413);
    expect(generateGeminiReply).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with a 400', async () => {
    resolveRequestUserId.mockResolvedValue('user-1');
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: '{bukan json',
    }));

    expect(response.status).toBe(400);
    expect(generateGeminiReply).not.toHaveBeenCalled();
  });
});
