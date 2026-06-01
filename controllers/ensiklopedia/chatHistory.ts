export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface HistorySession {
  id: string;
  date: string;
  preview: string;
  messages: ChatMessage[];
}

export interface GeminiHistoryMessage {
  role: ChatMessage['role'];
  content: string;
}

const MAX_HISTORY_SESSIONS = 20;

export function isValidChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.role === 'user' || obj.role === 'ai') &&
    typeof obj.content === 'string' &&
    typeof obj.timestamp === 'string'
  );
}

export function normalizeHistorySessions(value: unknown): HistorySession[] {
  if (!Array.isArray(value)) return [];

  return value.filter((session): session is HistorySession => {
    if (!session || typeof session !== 'object') return false;

    const obj = session as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      typeof obj.date === 'string' &&
      typeof obj.preview === 'string' &&
      Array.isArray(obj.messages) &&
      obj.messages.every(isValidChatMessage)
    );
  });
}

export function buildHistorySession(messages: ChatMessage[], dateLabel: string): HistorySession | null {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  if (!firstUserMessage) return null;

  return {
    id: firstUserMessage.id,
    date: dateLabel,
    preview: firstUserMessage.content.slice(0, 80),
    messages,
  };
}

export function upsertHistorySession(history: HistorySession[], nextSession: HistorySession) {
  return [
    nextSession,
    ...history.filter((session) => session.id !== nextSession.id),
  ].slice(0, MAX_HISTORY_SESSIONS);
}

export function buildGeminiHistoryPayload(
  messages: ChatMessage[],
  currentPrompt: string,
  options: { excludeTrailingCurrentPrompt: boolean },
): GeminiHistoryMessage[] {
  const trimmedPrompt = currentPrompt.trim();
  const trailingMessage = messages.at(-1);
  const historyMessages =
    options.excludeTrailingCurrentPrompt &&
    trailingMessage?.role === 'user' &&
    trailingMessage.content.trim() === trimmedPrompt
      ? messages.slice(0, -1)
      : messages;

  return historyMessages.slice(-10).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
