import { describe, expect, it, vi } from 'vitest';
import { buildNotificationDecision } from '@/lib/server/notifications/decision';

vi.mock('@/lib/server/ai/gemini', () => ({
  generateNotificationDecisionMessage: vi.fn(async ({ draftMessage }: { draftMessage: string }) => draftMessage),
}));

describe('notification decision with BMKG warnings', () => {
  it('sends a high-priority notification for active severe BMKG warning', async () => {
    const result = await buildNotificationDecision({
      platform: 'whatsapp',
      to: '08123456789',
      recipientName: 'Budi',
      notificationsEnabled: true,
      weather: {
        kondisi: 'berawan',
        suhu: 26,
        kelembapan: 80,
        curahHujan: 0,
        kecepatanAngin: 5,
        lokasi: 'Mulyoagung, Dau, Kabupaten Malang',
      },
      metadata: {
        bmkgWarnings: [{
          id: 'w1',
          event: 'Hujan Lebat',
          headline: 'Peringatan dini cuaca Jawa Timur',
          description: 'Malang berpotensi hujan lebat',
          severity: 'Severe',
          urgency: 'Immediate',
          certainty: 'Likely',
          affectedAreas: ['Malang'],
          source: 'BMKG',
        }],
      },
    });

    expect(result.shouldSend).toBe(true);
    expect(result.riskLevel).toMatch(/tinggi|ekstrem/);
    expect(result.triggeredRules.some((rule) => rule.code === 'BMKG_WARNING_SEVERE')).toBe(true);
    expect(result.finalMessage).toContain('Peringatan dini cuaca Jawa Timur');
  });
});
