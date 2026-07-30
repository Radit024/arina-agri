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

  it('still replies successfully for a guest (no resolvable user id)', async () => {
    resolveRequestUserId.mockResolvedValue(null);
    generateGeminiReply.mockResolvedValue('Balasan AI untuk tamu');
    const { POST } = await import('@/app/api/ai/gemini/route');

    const response = await POST(new Request('http://localhost/api/ai/gemini', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Halo' }),
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.reply).toBe('Balasan AI untuk tamu');
    expect(recordEvent).toHaveBeenCalledWith({
      userId: null,
      feature: 'ai_chat',
      eventType: 'action',
      eventName: 'chat_message_sent',
    });
  });
});
