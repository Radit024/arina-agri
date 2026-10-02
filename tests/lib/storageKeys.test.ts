import { describe, expect, it } from 'vitest';

import {
  SELECTED_FINANCE_PROJECT_KEY,
  WEATHER_TELEGRAM_CONTACT_KEY,
  WEATHER_WHATSAPP_PHONE_KEY,
  scopedStorageKey,
} from '@/lib/storageKeys';

describe('shared localStorage keys', () => {
  it('exposes every key prefix as a non-empty value', () => {
    expect(WEATHER_WHATSAPP_PHONE_KEY.trim()).not.toBe('');
    expect(WEATHER_TELEGRAM_CONTACT_KEY.trim()).not.toBe('');
    expect(SELECTED_FINANCE_PROJECT_KEY.trim()).not.toBe('');
  });

  it('keeps every key prefix distinct so two features cannot share one slot', () => {
    expect(WEATHER_WHATSAPP_PHONE_KEY).not.toBe(WEATHER_TELEGRAM_CONTACT_KEY);
    expect(WEATHER_WHATSAPP_PHONE_KEY).not.toBe(SELECTED_FINANCE_PROJECT_KEY);
    expect(WEATHER_TELEGRAM_CONTACT_KEY).not.toBe(SELECTED_FINANCE_PROJECT_KEY);
  });

  it('pins the key values already written into users\' browsers — changing one needs a localStorage migration', () => {
    const SHIPPED_KEYS = {
      whatsapp: WEATHER_WHATSAPP_PHONE_KEY,
      telegram: WEATHER_TELEGRAM_CONTACT_KEY,
      finance: SELECTED_FINANCE_PROJECT_KEY,
    } as const;

    expect(SHIPPED_KEYS).toEqual({
      whatsapp: 'arina-weather-whatsapp-phone',
      telegram: 'arina-weather-telegram-contact',
      finance: 'arina-selected-finance-project',
    });
  });

  it('scopes a weather key to one user without hiding the prefix', () => {
    const scoped = scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, 'user-1');
    expect(scoped.startsWith(`${WEATHER_WHATSAPP_PHONE_KEY}-`)).toBe(true);
    expect(scoped.endsWith('user-1')).toBe(true);
  });

  it('keeps two signed-in users out of each other\'s notification slot', () => {
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, 'user-1')).not.toBe(
      scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, 'user-2'),
    );
  });

  it('falls back to a single guest slot when there is no session', () => {
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY)).toBe(`${WEATHER_WHATSAPP_PHONE_KEY}-guest`);
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, null)).toBe(`${WEATHER_WHATSAPP_PHONE_KEY}-guest`);
    expect(scopedStorageKey(WEATHER_WHATSAPP_PHONE_KEY, '')).toBe(`${WEATHER_WHATSAPP_PHONE_KEY}-guest`);
  });
});
