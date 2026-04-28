export type NotificationPlatform = 'whatsapp' | 'telegram';

export interface ChannelNotificationPayload {
  platform: NotificationPlatform;
  to: string;
  message: string;
  metadata?: Record<string, any>;
}

interface ChannelSendResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function isNumericChatId(value: string) {
  return /^-?\d+$/.test(value);
}

function normalizeTelegramIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

async function resolveTelegramChatId(input: string, apiBase: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (isNumericChatId(trimmed)) return trimmed;

  const normalized = normalizeTelegramIdentifier(trimmed);

  // Try getChat first (works for public channels/groups and some users)
  try {
    const chatResponse = await fetch(`${apiBase}/getChat?chat_id=${encodeURIComponent(normalized)}`);
    const chatData = await chatResponse.json() as any;
    if (chatResponse.ok && chatData?.ok && chatData?.result?.id) {
      return String(chatData.result.id);
    }
  } catch {
    // fallback to getUpdates
  }

  // Fallback: search recent updates (user must have started the bot)
  const updatesResponse = await fetch(`${apiBase}/getUpdates?limit=50`);
  const updatesData = await updatesResponse.json() as any;
  if (!updatesResponse.ok || !updatesData?.ok) {
    throw new Error('Tidak bisa mengakses update Telegram. Pastikan bot aktif dan token benar.');
  }

  const target = normalized.replace('@', '').toLowerCase();
  const updates = Array.isArray(updatesData.result) ? updatesData.result : [];
  for (const update of updates) {
    const message = update.message || update.channel_post || update.my_chat_member;
    const fromUsername = message?.from?.username || message?.chat?.username;
    if (fromUsername && String(fromUsername).toLowerCase() === target) {
      const chatId = message?.chat?.id || update?.message?.chat?.id;
      if (chatId !== undefined && chatId !== null) {
        return String(chatId);
      }
    }
  }

  throw new Error('Username Telegram belum terdeteksi. Pastikan user sudah menekan START dan mengirim pesan ke bot.');
}

async function sendWhatsAppCloud(payload: ChannelNotificationPayload): Promise<ChannelSendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION || 'v19.0';

  if (!token || !phoneNumberId) {
    return {
      success: false,
      error: 'WhatsApp Cloud API belum dikonfigurasi. Isi WHATSAPP_CLOUD_TOKEN dan WHATSAPP_PHONE_NUMBER_ID.',
    };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: payload.to,
      type: 'text',
      text: {
        body: payload.message,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `WhatsApp Cloud API error: ${response.status} ${response.statusText} - ${errorText}`,
    };
  }

  const data = await response.json();
  return { success: true, data };
}

async function sendTelegram(payload: ChannelNotificationPayload): Promise<ChannelSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return {
      success: false,
      error: 'Telegram Bot API belum dikonfigurasi. Isi TELEGRAM_BOT_TOKEN di .env.',
    };
  }

  const apiBase = process.env.TELEGRAM_API_URL || `https://api.telegram.org/bot${token}`;

  let chatId = payload.to.trim();
  try {
    chatId = await resolveTelegramChatId(chatId, apiBase);
  } catch (error) {
    return {
      success: false,
      error: `Telegram API: ${error instanceof Error ? error.message : 'Gagal resolve username Telegram.'}`,
    };
  }
  
  try {
    const response = await fetch(`${apiBase}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      let friendlyError = data.description || 'Gagal mengirim pesan ke Telegram';
      
      // Penanganan khusus error 'chat not found'
      if (data.description === 'Bad Request: chat not found') {
        friendlyError = `Chat ID "${chatId}" tidak ditemukan. Pastikan user sudah menekan 'START' di bot Anda atau Chat ID sudah benar.`;
      }

      return {
        success: false,
        error: `Telegram API: ${friendlyError}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Koneksi ke Telegram gagal: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function sendDirectNotification(payload: ChannelNotificationPayload): Promise<ChannelSendResult> {
  if (payload.platform === 'whatsapp') {
    return sendWhatsAppCloud(payload);
  }

  if (payload.platform === 'telegram') {
    return sendTelegram(payload);
  }

  return {
    success: false,
    error: 'Platform tidak dikenal. Gunakan "whatsapp" atau "telegram".',
  };
}
