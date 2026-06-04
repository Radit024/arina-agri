export interface NormalizedTelegramContact {
  telegramUsername: string;
  telegramChatId: string;
  displayValue: string;
}

export function normalizeWhatsAppPhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function normalizeTelegramUsername(input: string) {
  return input.trim().replace(/^@+/, '').toLowerCase();
}

export function normalizeTelegramContact(input: string): NormalizedTelegramContact {
  const value = input.trim();
  const withoutAt = value.replace(/^@+/, '');

  if (!withoutAt) {
    return { telegramUsername: '', telegramChatId: '', displayValue: '' };
  }

  if (/^-?\d+$/.test(withoutAt)) {
    return {
      telegramUsername: '',
      telegramChatId: withoutAt,
      displayValue: withoutAt,
    };
  }

  const telegramUsername = normalizeTelegramUsername(withoutAt);
  return {
    telegramUsername,
    telegramChatId: '',
    displayValue: telegramUsername ? `@${telegramUsername}` : '',
  };
}

export function formatTelegramContact(telegramUsername?: string | null, telegramChatId?: string | null) {
  const chatId = telegramChatId?.trim();
  if (chatId) return chatId;

  const username = normalizeTelegramUsername(telegramUsername ?? '');
  return username ? `@${username}` : '';
}
