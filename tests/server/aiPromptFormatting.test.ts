import { SYSTEM_PROMPTS } from '@/lib/server/ai/gemini';
import { describe, expect, it } from 'vitest';

describe('AI chat output formatting prompt', () => {
  it('instructs encyclopedia replies to use structured markdown and math formatting', () => {
    expect(SYSTEM_PROMPTS.ensiklopedia).toContain('Markdown');
    expect(SYSTEM_PROMPTS.ensiklopedia).toContain('LaTeX');
    expect(SYSTEM_PROMPTS.ensiklopedia).toContain('tabel Markdown');
    expect(SYSTEM_PROMPTS.ensiklopedia).toContain('maksimal 2 kalimat');
    expect(SYSTEM_PROMPTS.ensiklopedia).toContain('rumus panjang');
  });
});
