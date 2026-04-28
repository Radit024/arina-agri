import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../.env.local'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export interface N8nNotificationPayload {
  platform: 'whatsapp' | 'telegram';
  to: string; // Target phone number (WhatsApp) atau Chat ID (Telegram)
  message: string;
  metadata?: Record<string, any>; // Data tambahan opsional
}

export const sendN8nNotification = async (payload: N8nNotificationPayload) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.error('N8N_WEBHOOK_URL is not defined in environment variables');
    return {
      success: false,
      error: 'N8N_WEBHOOK_URL belum diisi. Pastikan env tersedia di backend (.env) atau root (.env.local), lalu restart server.',
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (webhookSecret) {
      headers.Authorization = `Bearer ${webhookSecret}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`n8n webhook error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to send notification via n8n: ${response.statusText}`);
    }

    // Terkadang n8n mereturn tipe content yang berbeda, kita amankan parsing json-nya
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending notification to n8n:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};
