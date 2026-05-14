import { describe, expect, it } from 'vitest';
import { isScheduleDue, isValidScheduleTime } from '@/lib/server/notifications/schedule';

const now = new Date('2026-05-14T00:10:00Z');

function makeSchedule(overrides: Partial<{ enabled: boolean; time: string; timezone: string; last_sent_at: string | null }> = {}) {
  return {
    id: 'sched-1',
    user_id: 'user-1',
    enabled: true,
    time: '07:00',
    timezone: 'Asia/Jakarta',
    platform: 'telegram' as const,
    recipient_name: 'Petani',
    recipient_number: null,
    telegram_chat_id: '123',
    custom_message: null,
    last_sent_at: null,
    ...overrides,
  };
}

describe('isValidScheduleTime', () => {
  it('accepts HH:mm format', () => {
    expect(isValidScheduleTime('07:30')).toBe(true);
  });

  it('rejects invalid time', () => {
    expect(isValidScheduleTime('7:3')).toBe(false);
  });
});

describe('isScheduleDue', () => {
  it('returns false when disabled', () => {
    const schedule = makeSchedule({ enabled: false });
    expect(isScheduleDue(schedule, now)).toBe(false);
  });

  it('returns true when due and not sent today', () => {
    const schedule = makeSchedule({ time: '07:00', timezone: 'Asia/Jakarta' });
    expect(isScheduleDue(schedule, now)).toBe(true);
  });

  it('allows Vercel Hobby hourly cron precision', () => {
    const schedule = makeSchedule({ time: '07:00', timezone: 'Asia/Jakarta' });
    const hobbyPrecisionNow = new Date('2026-05-14T00:59:00Z');
    expect(isScheduleDue(schedule, hobbyPrecisionNow)).toBe(true);
  });

  it('returns false when already sent today', () => {
    const schedule = makeSchedule({ last_sent_at: '2026-05-14T00:00:00Z' });
    expect(isScheduleDue(schedule, now)).toBe(false);
  });
});
