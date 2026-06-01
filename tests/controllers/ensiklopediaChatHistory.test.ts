import {
  buildGeminiHistoryPayload,
  buildHistorySession,
  normalizeHistorySessions,
  upsertHistorySession,
  type ChatMessage,
} from '@/controllers/ensiklopedia/chatHistory';
import { describe, expect, it } from 'vitest';

const userMessage: ChatMessage = {
  id: 'user-1',
  role: 'user',
  content: 'Daun cabai menguning karena apa?',
  timestamp: '2026-06-01T08:00:00.000Z',
};

const aiMessage: ChatMessage = {
  id: 'ai-1',
  role: 'ai',
  content: 'Kemungkinan karena defisiensi nitrogen atau virus.',
  timestamp: '2026-06-01T08:00:05.000Z',
};

describe('AI chat history helpers', () => {
  it('builds a session preview from the first user message', () => {
    const session = buildHistorySession([userMessage, aiMessage], '1 Jun 2026');

    expect(session).toEqual({
      id: 'user-1',
      date: '1 Jun 2026',
      preview: 'Daun cabai menguning karena apa?',
      messages: [userMessage, aiMessage],
    });
  });

  it('upserts the latest session and keeps at most 20 sessions', () => {
    const existing = Array.from({ length: 20 }, (_, index) => ({
      id: `old-${index}`,
      date: '31 Mei 2026',
      preview: `Old ${index}`,
      messages: [userMessage],
    }));
    const next = buildHistorySession([userMessage, aiMessage], '1 Jun 2026');

    expect(next).not.toBeNull();
    const updated = upsertHistorySession(existing, next!);

    expect(updated).toHaveLength(20);
    expect(updated[0]).toBe(next);
    expect(updated.some((session) => session.id === 'old-19')).toBe(false);
  });

  it('drops invalid saved history entries', () => {
    const normalized = normalizeHistorySessions([
      { id: 'valid', date: '1 Jun 2026', preview: 'Valid', messages: [userMessage] },
      { id: 123, date: '1 Jun 2026', preview: 'Invalid', messages: [] },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe('valid');
  });

  it('removes only the trailing failed prompt from retry history payload', () => {
    const retryPrompt = 'Daun cabai menguning karena apa?';
    const previousSamePrompt: ChatMessage = {
      ...userMessage,
      id: 'user-previous',
      timestamp: '2026-06-01T07:00:00.000Z',
    };
    const failedPrompt: ChatMessage = {
      ...userMessage,
      id: 'user-failed',
      timestamp: '2026-06-01T08:01:00.000Z',
    };

    const payload = buildGeminiHistoryPayload(
      [previousSamePrompt, aiMessage, failedPrompt],
      retryPrompt,
      { excludeTrailingCurrentPrompt: true },
    );

    expect(payload).toEqual([
      { role: 'user', content: retryPrompt },
      { role: 'ai', content: aiMessage.content },
    ]);
  });
});
