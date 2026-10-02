// Akses data domain: ai.

import type {
  FinanceProject,
  FinanceTransactionForReport,
  RabItem,
} from '@/lib/finance/rabTypes';
import type {
  GeminiChatMessage,
  GeminiWeatherContextPayload,
} from './types';
import { apiFetch } from './client';

export const aiApi = {
  askGemini: (payload: { prompt: string; history?: GeminiChatMessage[]; userName?: string; weatherContext?: GeminiWeatherContextPayload }) =>
    apiFetch<{ reply: string; model: string }>('/api/ai/gemini', payload),

  generateFinancialReport: (payload: {
    periode: string;
    totalPendapatan: number;
    totalPengeluaran: number;
    labaBersih: number;
    userName?: string;
    project?: FinanceProject | null;
    rabItems?: RabItem[];
    transactions: FinanceTransactionForReport[];
  }) =>
    apiFetch<{ analysis: string; model: string }>('/api/ai/financial-report', payload),
};
