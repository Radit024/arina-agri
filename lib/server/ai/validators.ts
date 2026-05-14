export function validateGeminiPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return { valid: false, message: 'Prompt tidak boleh kosong.' };
  }

  return { valid: true };
}

export function validateFinancialReportPayload(body: any): { valid: boolean; message?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Payload tidak valid.' };
  }

  if (!body.periode || typeof body.periode !== 'string') {
    return { valid: false, message: 'Data laporan tidak lengkap.' };
  }

  if (!Array.isArray(body.transactions)) {
    return { valid: false, message: 'Data laporan tidak valid.' };
  }

  return { valid: true };
}