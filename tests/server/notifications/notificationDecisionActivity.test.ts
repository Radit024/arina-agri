import { describe, expect, it, vi } from 'vitest';
import { buildNotificationDecision } from '@/lib/server/notifications/decision';
import { generateNotificationDecisionMessage } from '@/lib/server/ai/gemini';

vi.mock('@/lib/server/ai/gemini', () => ({
  generateNotificationDecisionMessage: vi.fn(async ({ draftMessage }: { draftMessage: string }) => draftMessage),
}));

describe('notification decision AI activity context', () => {
  it('passes agenda and BMKG warning context to AI refinement', async () => {
    const bmkgWarnings = [{
      id: 'warning-1',
      event: 'Hujan Lebat',
      headline: 'Peringatan dini cuaca Jawa Timur',
      description: 'Malang berpotensi hujan lebat.',
      severity: 'Severe',
      affectedAreas: ['Malang'],
      source: 'BMKG' as const,
    }];
    const dailyEvents = [{
      title: 'Penyemprotan',
      time: '08:00',
      category: 'penyemprotan',
      note: 'Cek angin sebelum mulai.',
    }];

    const result = await buildNotificationDecision({
      platform: 'telegram',
      to: '123456',
      recipientName: 'Budi',
      notificationsEnabled: true,
      weather: {
        kondisi: 'hujan',
        suhu: 24,
        kelembapan: 82,
        curahHujan: 6,
        kecepatanAngin: 8,
        lokasi: 'Mulyoagung, Dau, Kabupaten Malang',
      },
      metadata: {
        source: 'vercel-cron-scheduler',
        forceSend: true,
        dailyEvents,
        bmkgWarnings,
      },
    });

    expect(result.shouldSend).toBe(true);
    expect(generateNotificationDecisionMessage).toHaveBeenCalledWith(expect.objectContaining({
      dailyEvents,
      bmkgWarnings,
    }));
  });
});
