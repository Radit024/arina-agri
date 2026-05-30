'use client';

import { useAuth } from '@/context/AuthContext';
import { useWeatherLocation } from '@/hooks/useWeatherLocation';
import { aiApi,weatherApi,type GeminiWeatherContextPayload } from '@/lib/api';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect,useRef,useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface HistorySession {
  id: string;
  date: string;
  preview: string;
  messages: ChatMessage[];
}

export function useEnsiklopediaController() {

  const theme = useTheme();
  const t = useTranslations('Encyclopedia');
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistorySession[]>([]);
  const [weatherContext, setWeatherContext] = useState<GeminiWeatherContextPayload>();
  const { activeAdm4, activeLocationLabel } = useWeatherLocation();

  const isValidChatMessage = (value: unknown): value is ChatMessage => {
    if (!value || typeof value !== 'object') return false;
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.id === 'string' &&
      (obj.role === 'user' || obj.role === 'ai') &&
      typeof obj.content === 'string' &&
      typeof obj.timestamp === 'string'
    );
  };

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
        try { setHistoryList(JSON.parse(savedHistory)); } catch { }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  useEffect(() => {
    let active = true;

    async function loadWeatherContext() {
      try {
        const [forecast, warnings] = await Promise.all([
          activeAdm4
            ? weatherApi.getForecast({ adm4: activeAdm4, locationLabel: activeLocationLabel })
            : Promise.resolve(null),
          weatherApi.getWarnings(),
        ]);
        if (!active) return;

        const forecastSummary = forecast
          ? forecast.days
              .slice(0, 3)
              .map((day) => `${day.date}: ${day.dominantCondition}, hujan ${day.totalRainfallMm}mm`)
              .join(' | ')
          : undefined;
        const warningSummary = warnings.warnings.length
          ? warnings.warnings.map((warning) => warning.headline || warning.description || warning.event).join(' | ')
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

  const handleClearChat = () => {
    localStorage.removeItem(getStorageKey());
    setMessages([]);
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
    setHistoryDrawerOpen(false);
  };

  const hasUserMessages = messages.some(m => m.role === 'user');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setChatError(null);

    const prompt = inputValue;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const historyPayload = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || undefined;
      const result = await aiApi.askGemini({ prompt, history: historyPayload, userName, weatherContext });
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: result.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setChatError(t('ai.error', { error: message }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
    handleKeyDown,
  };
}

export type UseEnsiklopediaControllerResult = ReturnType<typeof useEnsiklopediaController>;
