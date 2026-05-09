'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonIcon from '@mui/icons-material/Person';
import SpaIcon from '@mui/icons-material/Spa';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Avatar from '@mui/material/Avatar';
import ReactMarkdown from 'react-markdown';
import { initialChatMessages, diseaseCards } from '@/lib/mockData';
import type { ChatMessage } from '@/lib/mockData';
import { aiApi } from '@/lib/api';
import { useTranslations } from 'next-intl';


import { useAuth } from '@/context/AuthContext';

export default function EnsiklopediaPage() {
  const theme = useTheme();
  const t = useTranslations('Encyclopedia');
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const firstName = (mounted && user?.user_metadata?.full_name) 
    ? user.user_metadata.full_name.split(' ')[0] 
    : (mounted && user?.email) 
      ? user.email.split('@')[0] 
      : 'Petani';

  const initialMessages = useMemo(() => {
    try {
      const raw = t.raw('initialMessages');
      if (!Array.isArray(raw)) return [];
      
      // Use a stable date during SSR to prevent hydration mismatch
      const baseTime = mounted ? Date.now() : 1715238000000; // Fixed fallback for SSR
      
      return raw.map((m: any, i: number) => ({
        id: `initial-${i}`,
        role: m.role,
        content: m.role === 'ai' ? m.content.replace('{name}', firstName) : m.content,
        timestamp: new Date(baseTime - (5 - i) * 60 * 1000).toISOString(),
      }));
    } catch (e) {
      return [];
    }
  }, [t, firstName, mounted]);

  const AI_RESPONSES: Record<string, string> = {
    default: t('ai.fallback.default'),
    antraknosa: t('ai.fallback.anthracnose'),
    pupuk: t('ai.fallback.fertilizer'),
  };

  const getBotReply = (message: string): string => {
    const msg = message.toLowerCase();
    if (msg.includes('antraknosa') || msg.includes('patek') || msg.includes('busuk')) return AI_RESPONSES.antraknosa;
    if (msg.includes('pupuk') || msg.includes('npk') || msg.includes('pemupukan')) return AI_RESPONSES.pupuk;
    return AI_RESPONSES.default;
  };

  useEffect(() => {
    if (!authLoading) {
      const arinaUserId = typeof window !== 'undefined' ? localStorage.getItem('arina_user_id') || 'guest' : 'guest';
      const storageKey = `arina_chat_${arinaUserId}`;
      const savedChat = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          } else {
            setMessages(initialMessages);
          }
        } catch (e) {
          setMessages(initialMessages);
        }
      } else {
        setMessages(initialMessages);
      }
    }
    // Only run initialization once when auth is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // Save messages to localStorage whenever they update
  useEffect(() => {
    if (messages.length > 0) {
      const arinaUserId = typeof window !== 'undefined' ? localStorage.getItem('arina_user_id') || 'guest' : 'guest';
      const storageKey = `arina_chat_${arinaUserId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages]);

  const handleClearChat = () => {
    const arinaUserId = typeof window !== 'undefined' ? localStorage.getItem('arina_user_id') || 'guest' : 'guest';
    const storageKey = `arina_chat_${arinaUserId}`;
    localStorage.removeItem(storageKey);
    setMessages(initialMessages);
  };

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
    } catch {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: getBotReply(prompt),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setChatError(t('ai.error'));
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
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        {t.rich('notice', { strong: (chunks) => <strong>{chunks}</strong> })}
      </Alert>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Chat Interface */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card 
            elevation={0}
            sx={{ 
              height: { xs: 500, sm: 600, md: 640 }, 
              display: 'flex', 
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: { xs: 3, sm: 4 },
              overflow: 'hidden'
            }}
          >
            {/* Header Chat */}
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                py: { xs: 1.5, sm: 2 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: 'background.default'
              }}
            >
              <Box
                sx={{
                  bgcolor: theme.palette.success.main,
                  width: { xs: 36, sm: 42 },
                  height: { xs: 36, sm: 42 },
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.2)}`
                }}
              >
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20 } }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2 }}>
                  Arina AI
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {t('online')}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ ml: 'auto' }}>
                <IconButton 
                  onClick={handleClearChat} 
                  size="small"
                  aria-label="Clear chat history"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Messages Area */}
            <Box 
              sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                p: { xs: 1.5, sm: 2.5 }, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                bgcolor: 'background.paper' 
              }}
            >
              {chatError && (
                <Alert severity="warning" sx={{ borderRadius: 3 }}>
                  {chatError}
                </Alert>
              )}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'flex-end',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isUser && (
                      <Box 
                        sx={{ 
                          display: { xs: 'none', sm: 'flex' },
                          width: 28, height: 28, borderRadius: '50%', 
                          bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, 
                          alignItems: 'center', justifyContent: 'center', mb: 0.5 
                        }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                      </Box>
                    )}
                    
                    <Box
                      sx={{
                        maxWidth: { xs: '90%', sm: '75%' },
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        backgroundColor: isUser ? theme.palette.success.main : 'background.default',
                        color: isUser ? '#fff' : 'text.primary',
                        boxShadow: isUser ? `0 4px 12px ${alpha(theme.palette.success.main, 0.15)}` : '0 2px 8px rgba(0,0,0,0.03)',
                        border: isUser ? 'none' : `1px solid ${theme.palette.divider}`
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: { xs: '0.85rem', sm: '0.9rem' },
                          lineHeight: 1.6,
                          '& p': { m: 0, mb: 1.5, '&:last-of-type': { mb: 0 } },
                          '& ul, & ol': { m: 0, pl: 2.5, mb: 1.5 },
                          '& li': { mb: 0.5 },
                          '& strong': { fontWeight: 700 },
                        }}
                      >
                        {msg.content.includes('*') || msg.content.includes('- ') ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{msg.content}</Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
              
              {isTyping && (
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                  <Box 
                    sx={{ 
                      display: { xs: 'none', sm: 'flex' },
                      width: 28, height: 28, borderRadius: '50%', 
                      bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main, 
                      alignItems: 'center', justifyContent: 'center', mb: 0.5 
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ px: 2.5, py: 1.5, borderRadius: '20px 20px 20px 4px', backgroundColor: 'background.default', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </Typography>
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* Input Area */}
            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default' }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1.5, 
                  alignItems: 'flex-end',
                  bgcolor: 'background.paper',
                  p: { xs: 0.5, sm: 1 },
                  borderRadius: { xs: 3, sm: 4 },
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <TextField
                  fullWidth
                  placeholder={t('inputPlaceholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  multiline
                  maxRows={4}
                  variant="standard"
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      sx: { px: 1, py: { xs: 0.75, sm: 0.5 }, fontSize: { xs: '0.875rem', sm: '0.95rem' } }
                    }
                  }}
                />
                <IconButton
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  sx={{
                    bgcolor: inputValue.trim() ? theme.palette.success.main : theme.palette.action.hover,
                    color: inputValue.trim() ? '#fff' : theme.palette.text.secondary,
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                    borderRadius: '12px',
                    '&:hover': { bgcolor: inputValue.trim() ? theme.palette.success.dark : theme.palette.action.hover },
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    mb: { xs: 0.25, sm: 0.5 },
                    mr: { xs: 0.25, sm: 0.5 }
                  }}
                >
                  <SendIcon sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, ml: 0.5 }} />
                </IconButton>
              </Box>
            </Box>
          </Card>

          {/* Quick prompts */}
          <Box 
            sx={{ 
              mt: 2, 
              display: 'flex', 
              flexWrap: { xs: 'nowrap', sm: 'wrap' }, 
              gap: 1,
              overflowX: { xs: 'auto', sm: 'visible' },
              pb: { xs: 1, sm: 0 },
              '::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
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
                  backgroundColor: alpha(theme.palette.success.main, 0.12), 
                  color: theme.palette.success.dark, 
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              />
            ))}
          </Box>
        </Grid>

        {/* Disease Quick Reference */}
        <Grid size={{ xs: 12, lg: 5 }} sx={{ mt: { xs: 2, lg: 0 } }}>
          <Box sx={{ mb: 2.5, display: 'flex' , alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 4, height: 24, bgcolor: theme.palette.success.main, borderRadius: 4 }} />
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, color: 'text.primary', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              {t('quickReference.title')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {t.raw('quickReference.diseases').map((disease: any) => (
              <Card
                key={disease.id}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  borderLeft: '4px solid',
                  borderLeftColor: disease.severity === 'tinggi' ? theme.palette.error.main : theme.palette.warning.main,
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: '20px !important' } }}>
                  <Box className="flex items-start justify-between mb-2" sx={{ gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '0.95rem', sm: '1rem' } }}>{disease.name}</Typography>
                    <Chip
                      label={t('quickReference.risk', { value: disease.loss })}
                      size="small"
                      sx={{
                        backgroundColor: disease.severity === 'tinggi' ? alpha(theme.palette.error.main, 0.12) : alpha(theme.palette.warning.main, 0.12),
                        color: disease.severity === 'tinggi' ? theme.palette.error.dark : theme.palette.warning.dark,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        height: 22
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      <strong style={{ color: theme.palette.text.secondary }}>{t('cause')}:</strong> {disease.cause}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      <strong style={{ color: theme.palette.text.secondary }}>{t('symptoms')}:</strong> {disease.symptoms}
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: alpha(theme.palette.success.main, 0.12), borderRadius: 2, p: 1.5, border: `1px dashed ${alpha(theme.palette.success.main, 0.3)}` }}>
                    <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      ✓ {disease.treatment}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
