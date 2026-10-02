import { describe, expect, it } from 'vitest';

import {
  SELECTED_FINANCE_PROJECT_KEY,
  WEATHER_TELEGRAM_CONTACT_KEY,
  WEATHER_WHATSAPP_PHONE_KEY,
  scopedStorageKey,
} from '@/lib/storageKeys';

describe('shared localStorage keys', () => {
  it('exposes every key prefix as a non-empty string', () => {
    const keys = [WEATHER_WHATSAPP_PHONE_KEY, WEATHER_TELEGRAM_CONTACT_KEY, SELECTED_FINANCE_PROJECT_KEY];

    for (const key of keys) {
      expect(typeof key).toBe('string');
      expect(key.trim()).not.toBe('');
    }
  });

  it('keeps the three key prefixes distinct so features cannot collide', () => {
    expect(new Set([WEATHER_WHATSAPP_PHONE_KEY, WEATHER_TELEGRAM_CONTACT_KEY, SELECTED_FINANCE_PROJECT_KEY]).size).toBe(3);
    expect(WEATHER_WHATSAPP_PHONE_KEY).not.toBe(WEATHER_TELEGRAM_CONTACT_KEY);
    expect(WEATHER_WHATSAPP_PHONE_KEY).not.toBe(SELECTED_FINANCE_PROJECT_KEY);
    expect(WEATHER_TELEGRAM_CONTACT_KEY).not.toBe(SELECTED_FINANCE_PROJECT_KEY);
  });

  it('pins the weather notification prefixes read by Kontakcuaca and written by Pengaturan', () => {
    expect(WEATHER_WHATSAPP_PHONE_KEY).toBe('arina-weather-whatsapp-phone');
    expect(WEATHER_TELEGRAM_CONTACT_KEY).toBe('arina-weather-telegram-contact');
    expect(SELECTED_FINANCE_PROJECT_KEY).toBe('arina-selected-finance-project');
  });

  it('qualifies a prefix with the user id as <prefix>-<userId>', () => {
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, 'user-1')).toBe('arina-weather-whatsapp-phone-user-1');
    expect(scopedStorageKey(WEATHER_TELEGRAM_CONTACT_KEY, 'user-1')).toBe('arina-weather-telegram-contact-user-1');
  });

  it('returns an identical key for identical inputs', () => {
    expect(scopedStorageKey(SELECTED_FINANCE_PROJECT_KEY, 'user-1')).toBe(
      scopedStorageKey(SELECTED_FINANCE_PROJECT_KEY, 'user-1'),
    );
  });

  it('separates keys built from different prefixes', () => {
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, 'user-1')).not.toBe(
      scopedStorageKey(WEATHER_TELEGRAM_CONTACT_KEY, 'user-1'),
    );
  });

  it('separates keys built from different user ids', () => {
    expect(scopedStorageKey(SELECTED_FINANCE_PROJECT_KEY, 'user-1')).not.toBe(
      scopedStorageKey(SELECTED_FINANCE_PROJECT_KEY, 'user-2'),
    );
  });

  it('falls back to a guest slot when there is no session', () => {
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY)).toBe('arina-weather-whatsapp-phone-guest');
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, null)).toBe('arina-weather-whatsapp-phone-guest');
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, '')).toBe('arina-weather-whatsapp-phone-guest');
  });
});
