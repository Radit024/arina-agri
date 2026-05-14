'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import CardContent from '@mui/material/CardContent';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import EmojiNatureOutlinedIcon from '@mui/icons-material/EmojiNatureOutlined';
import CustomSpaIcon from '@mui/icons-material/SpaOutlined'; // Using a similar icon
import ReactMarkdown from 'react-markdown';
import { aiApi } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

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

export default function EnsiklopediaPage() {
  const theme = useTheme();
  const t = useTranslations('Encyclopedia');
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diseaseModalOpen, setDiseaseModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistorySession[]>([]);

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
      const result = await aiApi.askGemini({ prompt, history: historyPayload, userName });
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

  return (
    <Box sx={{ height: { xs: 'calc(100dvh - 148px)', md: '100dvh' }, display: 'flex', flexDirection: 'column', position: 'relative', bgcolor: 'background.default', overflow: 'hidden' }}>

      {/* Minimal Header */}
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        {/* Left Side: Logo/Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
              width: 32,
              height: 32,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AutoAwesomeIcon sx={{ color: theme.palette.text.primary, fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2 }}>
              Arina AI
            </Typography>
          </Box>
        </Box>

        {/* Right Side: Actions */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="text"
            startIcon={<BugReportOutlinedIcon />}
            onClick={() => setDiseaseModalOpen(true)}
            size="small"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05), color: 'text.primary' },
            }}
          >
            {t('quickReference.title')}
          </Button>
          <Tooltip title={t('quickReference.title')}>
            <IconButton
              onClick={() => setDiseaseModalOpen(true)}
              size="small"
              sx={{ display: { xs: 'flex', sm: 'none' }, color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05), color: 'text.primary' } }}
            >
              <BugReportOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<HistoryIcon sx={{ mr: { xs: -0.5, sm: 0 } }} />}
            onClick={() => setHistoryDrawerOpen(true)}
            size="small"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              borderColor: alpha(theme.palette.primary.main, 0.3),
              color: 'primary.main',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Riwayat Chat</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Riwayat</Box>
          </Button>
          <Tooltip title="Hapus Chat Saat Ini">
            <IconButton
              onClick={handleClearChat}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' } }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Messages Scroll Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <Box
          sx={{
            maxWidth: '800px',
            width: '100%',
            p: { xs: 2, md: 4 },
            pb: { xs: 4, md: 6 },
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          {/* Welcome Screen — shown only when no user messages yet */}
          {!hasUserMessages && (
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
              px: 2,
              animation: 'fadeIn 0.5s ease-out',
              '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } }
            }}>
              {/* Icon */}
              <Box sx={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
                boxShadow: `0 12px 36px ${alpha(theme.palette.success.main, 0.35)}`
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 40, color: '#fff' }} />
              </Box>

              {/* Title */}
              <Typography variant="h4" sx={{
                fontWeight: 800, fontFamily: 'var(--font-sora)', mb: 1.5, textAlign: 'center',
                background: `linear-gradient(90deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {t('welcome.title')}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5, textAlign: 'center', maxWidth: '400px', fontWeight: 500, lineHeight: 1.6 }}>
                {t('welcome.subtitle')}
              </Typography>

              {/* Suggestion Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, width: '100%', maxWidth: '640px' }}>
                {[
                  { text: t('prompts.p1'), icon: <WaterDropOutlinedIcon sx={{ color: 'info.main' }} />, bg: alpha(theme.palette.info.main, 0.05), border: alpha(theme.palette.info.main, 0.2) },
                  { text: t('prompts.p2'), icon: <ShieldOutlinedIcon sx={{ color: 'error.main' }} />, bg: alpha(theme.palette.error.main, 0.05), border: alpha(theme.palette.error.main, 0.2) },
                  { text: t('prompts.p3'), icon: <CustomSpaIcon sx={{ color: 'success.main' }} />, bg: alpha(theme.palette.success.main, 0.05), border: alpha(theme.palette.success.main, 0.2) },
                  { text: t('prompts.p4'), icon: <EmojiNatureOutlinedIcon sx={{ color: 'warning.main' }} />, bg: alpha(theme.palette.warning.main, 0.05), border: alpha(theme.palette.warning.main, 0.2) }
                ].map((prompt, idx) => (
                  <Card
                    key={`prompt-${idx}`}
                    elevation={0}
                    onClick={() => { setInputValue(prompt.text); }}
                    sx={{
                      p: 2.5, border: '1px solid', borderColor: prompt.border, borderRadius: 4,
                      bgcolor: theme.palette.mode === 'dark' ? alpha(prompt.bg, 0.1) : prompt.bg,
                      cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', gap: 2,
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 24px ${alpha(theme.palette.text.primary, 0.08)}`,
                      }
                    }}
                  >
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '50%',
                      bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.08) : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
                    }}>
                      {prompt.icon}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                      {prompt.text}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {chatError && (
            <Alert severity="warning" sx={{ borderRadius: 3, mb: 2 }}>
              {chatError}
            </Alert>
          )}

          {hasUserMessages && messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  gap: { xs: 1.5, sm: 2 },
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                  animation: 'slideUpFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  '@keyframes slideUpFadeIn': {
                    '0%': { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
                    '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
                  }
                }}
              >
                {/* AI Avatar */}
                {!isUser && (
                  <Box
                    sx={{
                      width: { xs: 32, sm: 36 },
                      height: { xs: 32, sm: 36 },
                      borderRadius: '40%', // Squircle shape
                      background: `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.5,
                      boxShadow: `0 4px 10px ${alpha(theme.palette.success.main, 0.2)}`
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: '#fff' }} />
                  </Box>
                )}

                {/* Message Content */}
                <Box
                  sx={{
                    maxWidth: isUser ? { xs: '85%', sm: '70%' } : 'calc(100% - 56px)', // Leave room for avatar
                  }}
                >
                  {isUser ? (
                    <Box
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : '#ffffff',
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: '24px 24px 4px 24px',
                        color: 'text.primary',
                        fontSize: { xs: '0.9rem', sm: '0.95rem' },
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, 0.5)
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{msg.content}</Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.1) : '#F4F9F4',
                        p: { xs: 2, sm: 2.5 },
                        borderRadius: '4px 24px 24px 24px',
                        fontSize: { xs: '0.9rem', sm: '0.95rem' },
                        lineHeight: 1.8, // More breathing room
                        color: 'text.primary',
                        boxShadow: 'none', // Flat look for AI to contrast with User
                        '& p': { m: 0, mb: 2.5, '&:last-of-type': { mb: 0 } },
                        '& ul, & ol': { m: 0, pl: 3, mb: 2.5 },
                        '& li': { mb: 1.5, pl: 0.5 },
                        '& strong': { fontWeight: 800, color: theme.palette.success.dark },
                        '& code': {
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                          px: 1, py: 0.25, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85em'
                        },
                        '& blockquote': {
                          borderLeft: `4px solid ${theme.palette.success.main}`,
                          bgcolor: alpha(theme.palette.success.main, 0.05),
                          m: 0, mb: 2.5, p: 2, borderRadius: '0 8px 8px 0',
                          color: 'text.secondary'
                        }
                      }}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, justifyContent: 'flex-start', width: '100%', animation: 'slideUpFadeIn 0.3s ease-out forwards' }}>
              <Box
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  borderRadius: '40%',
                  background: `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.5,
                  boxShadow: `0 4px 10px ${alpha(theme.palette.success.main, 0.2)}`
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: '#fff' }} />
              </Box>
              <Box sx={{ pt: 1.5 }}>
                <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center', bgcolor: '#F4F9F4', px: 2, py: 1.5, borderRadius: '4px 24px 24px 24px' }}>
                  {[0, 150, 300].map((delay) => (
                    <Box key={delay} sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: 'success.main',
                      animation: 'bounce 1s infinite cubic-bezier(0.4, 0, 0.2, 1)',
                      animationDelay: `${delay}ms`,
                      opacity: 0.6,
                      '@keyframes bounce': {
                        '0%, 100%': { transform: 'translateY(0)', opacity: 0.6 },
                        '50%': { transform: 'translateY(-6px)', opacity: 1 }
                      }
                    }} />
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Fixed Input Area */}
      <Box
        sx={{
          px: 2,
          pb: 0,
          pt: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ maxWidth: '800px', width: '100%', position: 'relative' }}>

          {/* Quick Prompts (Only show if not empty state to avoid duplication) */}
          {hasUserMessages && (
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  gap: 1,
                  overflowX: 'auto',
                  mb: 1.5,
                  pb: 0.5,
                  '::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                  px: 1,
                  maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                }}
              >
                {[t('prompts.p1'), t('prompts.p2'), t('prompts.p3'), t('prompts.p4')].map((prompt) => (
                  <Chip
                    key={prompt}
                    label={prompt}
                    size="small"
                    clickable
                    onClick={() => setInputValue(prompt)}
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? alpha('#fff', 0.1) : alpha('#fff', 0.8),
                      backdropFilter: 'blur(8px)',
                      color: 'text.secondary',
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      height: 32,
                      borderRadius: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? alpha('#fff', 0.15) : '#fff',
                        color: 'success.main',
                        borderColor: 'success.main',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input Box - Glassmorphism */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1.5,
              bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.grey[900], 0.8) : alpha('#ffffff', 0.85),
              backdropFilter: 'blur(20px)',
              p: 1.5,
              pl: 3,
              borderRadius: '32px',
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' ? alpha(theme.palette.grey[800], 0.5) : alpha(theme.palette.success.main, 0.2),
              boxShadow: theme.palette.mode === 'dark' ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(22,163,74,0.15)',
              transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
              '&:focus-within': {
                borderColor: theme.palette.success.main,
                boxShadow: theme.palette.mode === 'dark' ? `0 10px 40px ${alpha(theme.palette.success.main, 0.3)}` : `0 15px 50px ${alpha(theme.palette.success.main, 0.25)}`,
                transform: 'translateY(-2px)',
              }
            }}
          >
            <TextField
              fullWidth
              placeholder={t('inputPlaceholder')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={6}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    py: 1,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }
                }
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!inputValue.trim()}
              sx={{
                bgcolor: inputValue.trim() ? 'success.main' : alpha(theme.palette.text.disabled, 0.1),
                color: inputValue.trim() ? '#fff' : 'text.disabled',
                width: 44,
                height: 44,
                borderRadius: '50%',
                '&:hover': {
                  bgcolor: inputValue.trim() ? 'success.dark' : alpha(theme.palette.text.disabled, 0.2),
                  transform: inputValue.trim() ? 'scale(1.05)' : 'none',
                },
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                mb: 0.5,
                mr: 0.5
              }}
            >
              <SendIcon sx={{ fontSize: '1.2rem', ml: inputValue.trim() ? 0.5 : 0 }} />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, mb: 1, color: 'text.secondary', fontSize: '0.7rem', fontWeight: 500 }}>
            Tekan Enter untuk mengirim, Shift + Enter untuk baris baru. AI ini dilatih khusus untuk cabai rawit.
          </Typography>
        </Box>
      </Box>

      {/* ── Disease Reference Modal ──────────────────────────────── */}
      <Dialog
        open={diseaseModalOpen}
        onClose={() => setDiseaseModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 4, overflow: 'hidden', bgcolor: 'background.default' } }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          fontFamily: 'var(--font-sora)',
          fontWeight: 700
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BugReportOutlinedIcon fontSize="small" />
            </Box>
            {t('quickReference.title')}
          </Box>
          <IconButton onClick={() => setDiseaseModalOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {t.raw('quickReference.diseases').map((disease: any) => (
              <Card
                key={disease.id}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: disease.severity === 'tinggi' ? 'error.main' : 'warning.main',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: '24px !important' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {disease.name}
                    </Typography>
                    <Chip
                      label={t('quickReference.risk', { value: disease.loss })}
                      size="small"
                      sx={{
                        backgroundColor: disease.severity === 'tinggi' ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                        color: disease.severity === 'tinggi' ? (theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.dark) : (theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.dark),
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 24,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                      <strong style={{ color: theme.palette.text.primary }}>{t('cause')}:</strong> {disease.cause}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                      <strong style={{ color: theme.palette.text.primary }}>{t('symptoms')}:</strong> {disease.symptoms}
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, p: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? theme.palette.success.light : theme.palette.success.dark, fontWeight: 600, fontSize: '0.9rem' }}>
                      ✓ {disease.treatment}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* ── Chat History Drawer ──────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        slotProps={{
          paper: { sx: { width: { xs: '90vw', sm: 380 }, p: 3, bgcolor: 'background.default' } }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            Riwayat Chat
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {historyList.length > 0 && (
              <Tooltip title="Hapus Semua Riwayat">
                <IconButton
                  onClick={handleClearHistory}
                  size="small"
                  sx={{ color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' } }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={() => setHistoryDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {historyList.length === 0 ? (
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, py: 8, color: 'text.disabled'
          }}>
            <HistoryIcon sx={{ fontSize: 48, opacity: 0.4 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              Belum ada riwayat percakapan.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {Object.entries(
              historyList.reduce((acc, session) => {
                const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const group = session.date === today ? 'Hari Ini' : 'Sebelumnya';
                if (!acc[group]) acc[group] = [];
                acc[group].push(session);
                return acc;
              }, {} as Record<string, typeof historyList>)
            ).map(([groupName, sessions]) => (
              <Box key={groupName}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                  {groupName}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {sessions.map((session) => (
                    <Box
                      key={session.id}
                      onClick={() => handleLoadHistory(session)}
                      sx={{
                        borderRadius: 2,
                        p: 1.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        '&:hover': { 
                          bgcolor: alpha(theme.palette.success.main, 0.08),
                          '& .delete-icon': { opacity: 1, transform: 'scale(1)' }
                        }
                      }}
                    >
                      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, mb: 0.5, pr: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.preview}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{session.date}</span>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.palette.text.disabled }} />
                        <span>{session.messages.length} pesan</span>
                      </Typography>
                      <IconButton
                        className="delete-icon"
                        size="small"
                        aria-label="Hapus riwayat chat"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteHistorySession(session.id);
                        }}
                        sx={{
                          position: 'absolute',
                          right: 6,
                          top: 6,
                          opacity: { xs: 1, sm: 0 },
                          transform: { xs: 'scale(1)', sm: 'scale(0.9)' },
                          transition: 'all 0.2s ease',
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) },
                        }}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
