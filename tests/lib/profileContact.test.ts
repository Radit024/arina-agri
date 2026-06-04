import { describe, expect, it } from 'vitest';

import {
  formatTelegramContact,
  normalizeTelegramContact,
  normalizeWhatsAppPhone,
} from '@/lib/profileContact';

describe('profile contact normalizers', () => {
  it('normalizes Indonesian WhatsApp numbers to international digits', () => {
    expect(normalizeWhatsAppPhone('0812-3456-7890')).toBe('6281234567890');
    expect(normalizeWhatsAppPhone('+62 812 3456 7890')).toBe('6281234567890');
  });

  it('splits Telegram username and numeric chat id into the correct profile columns', () => {
    expect(normalizeTelegramContact('@PetaniMaju')).toEqual({
      telegramUsername: 'petanimaju',
      telegramChatId: '',
      displayValue: '@petanimaju',
    });
    expect(normalizeTelegramContact('123456789')).toEqual({
      telegramUsername: '',
      telegramChatId: '123456789',
      displayValue: '123456789',
    });
  });

  it('prefers chat id when formatting Telegram contact for forms', () => {
    expect(formatTelegramContact('petanimaju', '123456789')).toBe('123456789');
    expect(formatTelegramContact('petanimaju', null)).toBe('@petanimaju');
  });
});
