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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('subtitle')}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        {t.rich('notice', { strong: (chunks) => <strong>{chunks}</strong> })}
      </Alert>

      <Grid container spacing={3}>
        {/* Chat Interface */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: { xs: 'calc(100dvh - 200px)', md: 600 }, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Arina AI Assistant</Typography>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>{t('online')}</Typography>
              </Box>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {chatError && (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  {chatError}
                </Alert>
              )}
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      p: 1.5,
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      backgroundColor: msg.role === 'user' ? 'primary.main' : '#f1f5f9',
                      color: msg.role === 'user' ? '#fff' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {isTyping && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Box sx={{ px: 2, py: 1.5, borderRadius: '16px 16px 16px 4px', backgroundColor: '#f1f5f9' }}>
                    <Typography variant="caption" color="text.secondary">{t('typing')}</Typography>
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* Input */}
            <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                placeholder={t('inputPlaceholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                multiline
                maxRows={3}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!inputValue.trim()}
                sx={{
                  backgroundColor: 'primary.main',
                  color: '#fff',
                  width: 40,
                  height: 40,
                  '&:hover': { backgroundColor: 'primary.dark' },
                  '&:disabled': { backgroundColor: '#e2e8f0', color: '#94a3b8' },
                  flexShrink: 0,
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Card>

          {/* Quick prompts */}
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[t('prompts.p1'), t('prompts.p2'), t('prompts.p3'), t('prompts.p4')].map((prompt) => (
              <Chip
                key={prompt}
                label={prompt}
                size="small"
                clickable
                onClick={() => setInputValue(prompt)}
                sx={{ backgroundColor: '#f0fdf4', color: 'primary.dark', border: '1px solid #bbf7d0', fontWeight: 500 }}
              />
            ))}
          </Box>
        </Grid>

        {/* Disease Quick Reference */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Typography variant="h6" sx={{ mb: 2, fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
            Referensi Cepat Penyakit Cabai
            {t('quickReferenceTitle')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {diseaseCards.map((disease) => (
              <Card
                key={disease.id}
                sx={{
                  borderLeft: '4px solid',
                  borderLeftColor: disease.tingkatSeveritas === 'tinggi' ? '#ef4444' : '#f59e0b',
                  transition: 'transform 0.15s',
                  '&:hover': { transform: 'translateX(4px)' },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box className="flex items-start justify-between mb-1.5">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{disease.nama}</Typography>
                    <Chip
                      label={t('lossLabel', { value: disease.kehilangan })}
                      size="small"
                      sx={{
                        backgroundColor: disease.tingkatSeveritas === 'tinggi' ? '#fee2e2' : '#fef3c7',
                        color: disease.tingkatSeveritas === 'tinggi' ? '#dc2626' : '#92400e',
                        fontWeight: 600,
                        fontSize: '0.68rem',
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    <strong>{t('cause')}:</strong> {disease.penyebab}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    <strong>{t('symptoms')}:</strong> {disease.gejala}
                  </Typography>
                  <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 1.5, px: 1.5, py: 1 }}>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                      💊 {disease.penanganan}
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
