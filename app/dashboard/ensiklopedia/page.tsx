'use client';

import { useState, useRef, useEffect } from 'react';
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
import Avatar from '@mui/material/Avatar';
import ReactMarkdown from 'react-markdown';
import { initialChatMessages, diseaseCards } from '@/lib/mockData';
import type { ChatMessage } from '@/lib/mockData';
import { aiApi } from '@/lib/api';
import { useTranslations } from 'next-intl';

const AI_RESPONSES: Record<string, string> = {
  default:
    'Maaf, koneksi ke Arina AI sedang tidak tersedia. Silakan cek koneksi internet dan pastikan backend berjalan, kemudian coba lagi. Pertanyaan Anda akan langsung dijawab oleh Gemini AI yang sudah dilatih untuk pertanian cabai.',
  antraknosa:
    '**Antraknosa (Patek)** disebabkan oleh jamur *Colletotrichum capsici*.\n\nGejala: bercak coklat kehitaman pada buah, biasanya mulai dari ujung buah.\n\nPenanganan darurat:\n• Semprot fungisida Mankozeb dosis 2 g/liter air\n• Buang dan bakar buah yang terinfeksi\n• Hindari melukai buah saat pemetikan\n• Jaga jarak tanam agar sirkulasi udara baik\n\n⚠️ Ini adalah jawaban offline. Terhubung ke internet untuk saran AI yang lebih akurat.',
  pupuk:
    'Rekomendasi pemupukan cabai rawit (fase generatif):\n\n• NPK 16-16-16 → 5 g/tanaman, tiap 2 minggu\n• Kalsium Boron → semprot daun 2 ml/liter\n• KCl → 3 g/tanaman untuk memperkuat buah\n\nWaktu terbaik: pagi hari sebelum jam 9.\n\n⚠️ Ini adalah jawaban offline. Terhubung ke internet untuk saran AI yang lebih akurat.',
};

function getBotReply(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('antraknosa') || msg.includes('patek') || msg.includes('busuk')) return AI_RESPONSES.antraknosa;
  if (msg.includes('pupuk') || msg.includes('npk') || msg.includes('pemupukan')) return AI_RESPONSES.pupuk;
  return AI_RESPONSES.default;
}

import { useAuth } from '@/context/AuthContext';

export default function EnsiklopediaPage() {
  const t = useTranslations('Encyclopedia');
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!authLoading) {
      setMessages(user ? [] : initialChatMessages);
    }
  }, [user, authLoading]);

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
      const result = await aiApi.askGemini({ prompt, history: historyPayload });
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
      setChatError('Gemini belum aktif atau terjadi kendala jaringan. Menampilkan jawaban fallback.');
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
                bgcolor: '#f8fafc'
              }}
            >
              <Box
                sx={{
                  bgcolor: '#16a34a',
                  width: { xs: 36, sm: 42 },
                  height: { xs: 36, sm: 42 },
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                }}
              >
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: { xs: 18, sm: 20 } }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'var(--font-sora)', color: '#0f172a', lineHeight: 1.2 }}>
                  Arina AI
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {t('online')}
                  </Typography>
                </Box>
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
                bgcolor: '#fff' 
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
                          bgcolor: '#f0fdf4', color: '#16a34a', 
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
                        backgroundColor: isUser ? '#16a34a' : '#f8fafc',
                        color: isUser ? '#fff' : '#1e293b',
                        boxShadow: isUser ? '0 4px 12px rgba(22, 163, 74, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                        border: isUser ? 'none' : '1px solid #e2e8f0'
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
                      bgcolor: '#f0fdf4', color: '#16a34a', 
                      alignItems: 'center', justifyContent: 'center', mb: 0.5 
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ px: 2.5, py: 1.5, borderRadius: '20px 20px 20px 4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
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
            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#f8fafc' }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1.5, 
                  alignItems: 'flex-end',
                  bgcolor: '#fff',
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
                    bgcolor: inputValue.trim() ? '#16a34a' : '#f1f5f9',
                    color: inputValue.trim() ? '#fff' : '#94a3b8',
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                    borderRadius: '12px',
                    '&:hover': { bgcolor: inputValue.trim() ? '#15803d' : '#f1f5f9' },
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
                  backgroundColor: '#f0fdf4', 
                  color: 'primary.dark', 
                  border: '1px solid #bbf7d0', 
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              />
            ))}
          </Box>
        </Grid>

        {/* Disease Quick Reference */}
        <Grid size={{ xs: 12, lg: 5 }} sx={{ mt: { xs: 2, lg: 0 } }}>
          <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 4, height: 24, bgcolor: '#16a34a', borderRadius: 4 }} />
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Referensi Cepat Penyakit
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {diseaseCards.map((disease) => (
              <Card
                key={disease.id}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  borderLeft: '4px solid',
                  borderLeftColor: disease.tingkatSeveritas === 'tinggi' ? '#ef4444' : '#f59e0b',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: '20px !important' } }}>
                  <Box className="flex items-start justify-between mb-2" sx={{ gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.95rem', sm: '1rem' } }}>{disease.nama}</Typography>
                    <Chip
                      label={`Risiko ${disease.kehilangan}`}
                      size="small"
                      sx={{
                        backgroundColor: disease.tingkatSeveritas === 'tinggi' ? '#fee2e2' : '#fef3c7',
                        color: disease.tingkatSeveritas === 'tinggi' ? '#b91c1c' : '#b45309',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        height: 22
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      <strong style={{ color: '#475569' }}>{t('cause')}:</strong> {disease.penyebab}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      <strong style={{ color: '#475569' }}>{t('symptoms')}:</strong> {disease.gejala}
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: '#f0fdf4', borderRadius: 2, p: 1.5, border: '1px dashed #bbf7d0' }}>
                    <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      ✓ {disease.penanganan}
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
