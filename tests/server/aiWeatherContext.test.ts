import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateGeminiReply } from '@/lib/server/ai/gemini';

const generateContentMock = vi.fn(async (prompt: string) => ({
  response: {
    text: () => `REPLY:${prompt}`,
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: generateContentMock,
    })),
  })),
}));

describe('generateGeminiReply weather context', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    generateContentMock.mockClear();
  });

  it('injects BMKG weather context into model prompt', async () => {
    await generateGeminiReply({
      prompt: 'Apa yang harus saya prioritaskan hari ini?',
      userName: 'Budi',
      weatherContext: {
        forecastSummary: 'Prakiraan 3 hari didominasi hujan ringan-sedang.',
        warningSummary: 'Peringatan dini BMKG: potensi angin kencang di Malang.',
      },
    });

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const mergedPrompt = String(generateContentMock.mock.calls[0][0]);
    expect(mergedPrompt).toContain('Prakiraan 3 hari didominasi hujan ringan-sedang.');
    expect(mergedPrompt).toContain('Peringatan dini BMKG: potensi angin kencang di Malang.');
  });
});
