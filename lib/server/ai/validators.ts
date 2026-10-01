function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export const GEMINI_MAX_PROMPT_LENGTH = 2_000;
export const GEMINI_MAX_HISTORY_MESSAGES = 20;
export const GEMINI_MAX_MESSAGE_LENGTH = 2_000;

export const FINANCIAL_REPORT_MAX_TRANSACTIONS = 500;

function isHistoryMessage(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.role !== 'user' && value.role !== 'ai') return false;
  if (typeof value.content !== 'string') return false;
  return value.content.length <= GEMINI_MAX_MESSAGE_LENGTH;
}

export function validateGeminiPayload(body: unknown): { valid: boolean; message?: string } {
  if (!isRecord(body)) {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return { valid: false, message: 'Prompt tidak boleh kosong.' };
  }

  if (body.prompt.length > GEMINI_MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      message: `Prompt maksimal ${GEMINI_MAX_PROMPT_LENGTH} karakter.`,
    };
  }

  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      return { valid: false, message: 'Riwayat percakapan tidak valid.' };
    }

    if (body.history.length > GEMINI_MAX_HISTORY_MESSAGES) {
      return {
        valid: false,
        message: `Riwayat percakapan maksimal ${GEMINI_MAX_HISTORY_MESSAGES} pesan.`,
      };
    }

    if (!body.history.every(isHistoryMessage)) {
      return { valid: false, message: 'Riwayat percakapan tidak valid.' };
    }
  }

  if (body.userName !== undefined && typeof body.userName !== 'string') {
    return { valid: false, message: 'Nama pengguna tidak valid.' };
  }

  return { valid: true };
}

export function validateFinancialReportPayload(body: unknown): { valid: boolean; message?: string } {
  if (!isRecord(body)) {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.periode || typeof body.periode !== 'string') {
    return { valid: false, message: 'Data laporan tidak lengkap.' };
  }

  if (body.periode.length > 64) {
    return { valid: false, message: 'Periode laporan tidak valid.' };
  }

  if (!Array.isArray(body.transactions)) {
    return { valid: false, message: 'Data laporan tidak valid.' };
  }

  if (body.transactions.length > FINANCIAL_REPORT_MAX_TRANSACTIONS) {
    return {
      valid: false,
      message: `Data transaksi terlalu banyak. Maksimal ${FINANCIAL_REPORT_MAX_TRANSACTIONS} transaksi.`,
    };
  }

  if (body.rabItems !== undefined && !Array.isArray(body.rabItems)) {
    return { valid: false, message: 'Data RAB tidak valid.' };
  }

  return { valid: true };
}