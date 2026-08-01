'use client';

import { useAuth } from '@/context/AuthContext';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import { aiApi, weatherApi, type GeminiWeatherContextPayload } from '@/lib/api';
import { filterWeatherWarningsByLocation } from '@/lib/dashboard/summary';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { trackPageView } from '@/lib/analytics/trackPageView';
import {
  buildGeminiHistoryPayload,
  buildHistorySession,
  isValidChatMessage,
  normalizeHistorySessions,
  upsertHistorySession,
  type ChatMessage,
  type HistorySession,
} from './chatHistory';

export function shouldSubmitChatShortcut(event: Pick<React.KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey'>) {
  return event.key === 'Enter' && (event.ctrlKey || event.metaKey);
}

export function useEnsiklopediaController() {

  const theme = useTheme();
  const t = useTranslations('Encyclopedia');

  useEffect(() => {
    void trackPageView('ai_chat');
  }, []);

  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistorySession[]>([]);
  const [weatherContext, setWeatherContext] = useState<GeminiWeatherContextPayload>();
  const { activeAdm4, activeLocationLabel } = useWeatherLocation();

  const getStorageKey = () => {
    const arinaUserId = typeof window !== 'undefined' ? localStorage.getItem('arina_user_id') || 'guest' : 'guest';
    return `arina_chat_${arinaUserId}`;
  };

  const getHistoryStorageKey = () => `arina_chat_history_${getStorageKey()}`;

  useEffect(() => {
    if (!authLoading) {
      const storageKey = getStorageKey();
      const savedChat = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          if (Array.isArray(parsed)) {
            const normalized = parsed
              .filter(isValidChatMessage)
              .filter((message) => !message.id.startsWith('initial-'));
            setMessages(normalized);
          } else {
            setMessages([]);
          }
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }

      // Load history sessions
      const historyKey = getHistoryStorageKey();
      const savedHistory = typeof window !== 'undefined' ? localStorage.getItem(historyKey) : null;
      if (savedHistory) {
        try {
          setHistoryList(normalizeHistorySessions(JSON.parse(savedHistory)));
        } catch {
          setHistoryList([]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  useEffect(() => {
    let active = true;

    async function loadWeatherContext() {
      try {
        if (!activeAdm4) {
          setWeatherContext(undefined);
          return;
        }

        const [forecast, warnings] = await Promise.all([
          weatherApi.getForecast({ adm4: activeAdm4, locationLabel: activeLocationLabel }),
          weatherApi.getWarnings(),
        ]);
        if (!active) return;

        const forecastSummary = forecast.days
          .slice(0, 3)
          .map((day) => `${day.date}: ${day.dominantCondition}, hujan ${day.totalRainfallMm}mm`)
          .join(' | ');
        const relevantWarnings = filterWeatherWarningsByLocation(warnings.warnings, forecast.locationLabel || activeLocationLabel);
        const warningSummary = relevantWarnings.length
          ? relevantWarnings.map((warning) => warning.headline || warning.description || warning.event).join(' | ')
          : 'Tidak ada peringatan dini aktif';

        setWeatherContext({ forecastSummary, warningSummary });
      } catch {
        if (!active) return;
        setWeatherContext(undefined);
      }
    }

    void loadWeatherContext();

    return () => {
      active = false;
    };
  }, [activeAdm4, activeLocationLabel]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(getStorageKey(), JSON.stringify(messages));
    }
  }, [messages]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const persistHistory = (nextMessages: ChatMessage[]) => {
    const dateLabel = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const session = buildHistorySession(nextMessages, dateLabel);
    if (!session) return;

    setHistoryList((prev) => {
      const updated = upsertHistorySession(prev, session);
      localStorage.setItem(getHistoryStorageKey(), JSON.stringify(updated));
      return updated;
    });
  };

  const sendPrompt = async (prompt: string, options: { appendUserMessage: boolean }) => {
    if (!prompt.trim() || isTyping) return;

    const trimmedPrompt = prompt.trim();
    setChatError(null);
    setLastFailedPrompt(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedPrompt,
      timestamp: new Date().toISOString(),
    };

    const historyPayload = buildGeminiHistoryPayload(messages, trimmedPrompt, {
      excludeTrailingCurrentPrompt: !options.appendUserMessage,
    });
    const baseMessages = options.appendUserMessage ? [...messages, userMsg] : messages;

    if (options.appendUserMessage) {
      setMessages(baseMessages);
    }
    setInputValue('');
    setIsTyping(true);

    try {
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || undefined;
      const result = await aiApi.askGemini({ prompt: trimmedPrompt, history: historyPayload, userName, weatherContext });
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: result.reply,
        timestamp: new Date().toISOString(),
      };
      const nextMessages = [...baseMessages, aiMsg];
      setMessages(nextMessages);
      persistHistory(nextMessages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastFailedPrompt(trimmedPrompt);
      setChatError(t('ai.error', { error: message }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    localStorage.removeItem(getStorageKey());
    setMessages([]);
    setChatError(null);
    setLastFailedPrompt(null);
  };

  const handleNewChat = () => {
    handleClearChat();
    setInputValue('');
    setHistoryDrawerOpen(false);
  };

  const handleDeleteHistorySession = (sessionId: string) => {
    const updated = historyList.filter((session) => session.id !== sessionId);
    setHistoryList(updated);
    localStorage.setItem(getHistoryStorageKey(), JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistoryList([]);
    localStorage.removeItem(getHistoryStorageKey());
  };

  const handleLoadHistory = (session: HistorySession) => {
    setMessages(session.messages);
    setChatError(null);
    setLastFailedPrompt(null);
    setHistoryDrawerOpen(false);
  };

  const handleSend = async () => {
    await sendPrompt(inputValue, { appendUserMessage: true });
  };

  const handleRetryLastPrompt = async () => {
    if (!lastFailedPrompt) return;
    await sendPrompt(lastFailedPrompt, { appendUserMessage: false });
  };

  const hasUserMessages = messages.some((message) => message.role === 'user');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (shouldSubmitChatShortcut(e)) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    theme,
    t,
    messages,
    diseaseModalOpen,
    setDiseaseModalOpen,
    historyDrawerOpen,
    setHistoryDrawerOpen,
    historyList,
    handleNewChat,
    handleClearChat,
    handleDeleteHistorySession,
    handleClearHistory,
    handleLoadHistory,
    hasUserMessages,
    inputValue,
    setInputValue,
    isTyping,
    chatError,
    messagesEndRef,
    handleSend,
    handleRetryLastPrompt,
    handleKeyDown,
    canRetryLastPrompt: Boolean(lastFailedPrompt),
  };
}

export type UseEnsiklopediaControllerResult = ReturnType<typeof useEnsiklopediaController>;
