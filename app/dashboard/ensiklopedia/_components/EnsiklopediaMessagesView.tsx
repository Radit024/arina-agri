'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CustomSpaIcon from '@mui/icons-material/SpaOutlined';
import EmojiNatureOutlinedIcon from '@mui/icons-material/EmojiNatureOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined';
import { alpha } from '@mui/material/styles';
import dynamic from 'next/dynamic';

import { accentText, softBg, softText } from '@/lib/themeColors';

import type { UseEnsiklopediaControllerResult } from '@/controllers/ensiklopedia/useEnsiklopediaController';

const ChatMarkdownRenderer = dynamic(
  () => import('./ChatMarkdownRenderer'),
  {
    ssr: false,
    loading: () => <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>...</Typography>,
  }
);

export interface EnsiklopediaMessagesViewProps
  extends Pick<
    UseEnsiklopediaControllerResult,
    | 'theme'
    | 't'
    | 'messages'
    | 'hasUserMessages'
    | 'isTyping'
    | 'chatError'
    | 'canRetryLastPrompt'
    | 'handleRetryLastPrompt'
    | 'messagesEndRef'
    | 'setInputValue'
  > {
  reduceMotion: boolean;
}

/**
 * Area pesan percakapan: daftar giliran tanya-jawab, status mengetik, error
 * yang bisa dicoba ulang, dan titik jangkar untuk auto-scroll.
 *
 * Dipisah dari `EnsiklopediaView` karena area ini scroll sendiri dan tidak
 * pernah menyentuh header maupun composer.
 */
export function EnsiklopediaMessagesView({
  theme,
  t,
  messages,
  hasUserMessages,
  isTyping,
  chatError,
  canRetryLastPrompt,
  handleRetryLastPrompt,
  messagesEndRef,
  setInputValue,
  reduceMotion,
}: EnsiklopediaMessagesViewProps) {
  return (
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
            pb: { xs: 3, md: 6 },
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
              animation: reduceMotion ? 'none' : 'fadeIn 0.5s ease-out',
              '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } }
            }}>
              {/* Icon */}
              <Box sx={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
                boxShadow: `0 12px 36px ${alpha(theme.palette.success.main, 0.35)}`
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 40, color: accentText(theme, 'success') }} />
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
              <Box
                data-guide-target="ai-quick-prompts"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(240px, 1fr))' },
                  gap: 2,
                  justifyContent: 'center',
                  maxWidth: '640px',
                  width: { xs: '100%', sm: 'fit-content' },
                }}
              >
                {[
                  { text: t('prompts.p1'), icon: <WaterDropOutlinedIcon sx={{ color: 'info.main' }} />, bg: alpha(theme.palette.info.main, 0.05), border: alpha(theme.palette.info.main, 0.2) },
                  { text: t('prompts.p2'), icon: <ShieldOutlinedIcon sx={{ color: 'error.main' }} />, bg: alpha(theme.palette.error.main, 0.05), border: alpha(theme.palette.error.main, 0.2) },
                  { text: t('prompts.p3'), icon: <CustomSpaIcon sx={{ color: 'success.main' }} />, bg: alpha(theme.palette.success.main, 0.05), border: alpha(theme.palette.success.main, 0.2) },
                  { text: t('prompts.p4'), icon: <EmojiNatureOutlinedIcon sx={{ color: 'warning.main' }} />, bg: alpha(theme.palette.warning.main, 0.05), border: alpha(theme.palette.warning.main, 0.2) }
                ].map((prompt) => (
                  <ButtonBase
                    key={prompt.text}
                    data-touch-target="44"
                    onClick={() => setInputValue(prompt.text)}
                    sx={{
                      alignItems: 'stretch',
                      borderRadius: 4,
                      display: 'block',
                      minHeight: 64,
                      textAlign: 'left',
                      width: '100%',
                      '&:focus-visible': {
                        outline: `3px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        p: 2.5, border: '1px solid', borderColor: prompt.border, borderRadius: 4,
                        bgcolor: theme.palette.mode === 'dark' ? alpha(prompt.bg, 0.1) : prompt.bg,
                        cursor: 'pointer', transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                        display: 'flex', alignItems: 'center', gap: 2,
                        height: '100%',
                        '&:hover': {
                          transform: reduceMotion ? 'none' : 'translateY(-2px)',
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
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          )}

          {chatError && (
            <Alert
              severity="warning"
              sx={{ borderRadius: 3, mb: 2 }}
              action={canRetryLastPrompt ? (
                <Button color="inherit" size="small" onClick={handleRetryLastPrompt} sx={{ minHeight: 44 }}>
                  {t('retryLastPrompt')}
                </Button>
              ) : undefined}
            >
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
                  animation: reduceMotion ? 'none' : 'slideUpFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
                      background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.5,
                      boxShadow: `0 4px 10px ${alpha(theme.palette.success.main, 0.2)}`
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: accentText(theme, 'success') }} />
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
                        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff',
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: '24px 24px 4px 24px',
                        color: 'text.primary',
                        fontSize: { xs: '0.9rem', sm: '0.95rem' },
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, 0.5)
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{msg.content}</Typography>
                    </Box>
                  ) : (
                    <Box
                      component="article"
                      aria-label="Jawaban Arina AI"
                      data-ai-markdown="readable"
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.16) : softBg(theme, 'success', 0.12),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.22 : 0.14),
                        p: { xs: 2.25, sm: 3 },
                        borderRadius: '4px 24px 24px 24px',
                        fontSize: { xs: '0.93rem', sm: '1rem' },
                        lineHeight: 1.72,
                        color: 'text.primary',
                        boxShadow: 'none', // Flat look for AI to contrast with User
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        letterSpacing: 0,
                        '& > :first-of-type': {
                          mt: 0,
                          pt: 0,
                          borderTop: 0,
                        },
                        '& > :last-child': {
                          mb: 0,
                        },
                        '& h1, & h2, & h3, & h4': {
                          fontFamily: 'var(--font-sora)',
                          color: 'text.primary',
                          fontWeight: 800,
                          lineHeight: 1.35,
                          letterSpacing: 0,
                          mt: 2.4,
                          mb: 1,
                          pt: 1.5,
                          borderTop: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                        },
                        '& h1:first-of-type, & h2:first-of-type, & h3:first-of-type, & h4:first-of-type': {
                          mt: 0,
                          pt: 0,
                          borderTop: 0,
                        },
                        '& h1': { fontSize: { xs: '1.16rem', sm: '1.24rem' } },
                        '& h2': { fontSize: { xs: '1.08rem', sm: '1.15rem' } },
                        '& h3': { fontSize: { xs: '1.02rem', sm: '1.08rem' } },
                        '& h4': { fontSize: { xs: '0.98rem', sm: '1.02rem' } },
                        '& p': {
                          m: 0,
                          mb: 1.45,
                          maxWidth: '68ch',
                          lineHeight: 1.72,
                          '&:last-of-type': { mb: 0 },
                        },
                        '& ul, & ol': {
                          m: 0,
                          pl: { xs: 2.75, sm: 3.25 },
                          mb: 1.6,
                          maxWidth: '68ch',
                        },
                        '& li': {
                          mb: 0.75,
                          pl: 0.4,
                          lineHeight: 1.68,
                        },
                        '& li::marker': {
                          color: softText(theme, 'success'),
                          fontWeight: 800,
                        },
                        '& li > p': {
                          m: 0,
                          mb: 0.7,
                          maxWidth: 'none',
                        },
                        '& li:last-child': { mb: 0 },
                        '& li > p:last-child': { mb: 0 },
                        '& ol > li': { mb: 1.35 },
                        '& ol > li > p:first-of-type': {
                          color: 'text.primary',
                          fontWeight: 650,
                        },
                        '& li ul, & li ol': {
                          mt: 0.75,
                          mb: 0.25,
                        },
                        '& strong': { fontWeight: 800, color: softText(theme, 'success') },
                        '& code': {
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                          color: 'text.primary',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: '8px',
                          fontFamily: 'monospace',
                          fontSize: '0.88em'
                        },
                        '& blockquote': {
                          borderLeft: `4px solid ${theme.palette.success.main}`,
                          bgcolor: alpha(theme.palette.success.main, 0.05),
                          m: 0,
                          mb: 1.6,
                          p: 2,
                          borderRadius: '0 8px 8px 0',
                          color: 'text.secondary',
                          maxWidth: '68ch',
                        },
                        '& a': {
                          color: softText(theme, 'success'),
                          textDecoration: 'underline',
                          overflowWrap: 'anywhere',
                        },
                        '& pre': {
                          maxWidth: '100%',
                          overflowX: 'auto',
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                          borderRadius: '8px',
                          p: 1.5,
                          mb: 1.6,
                          lineHeight: 1.55,
                        },
                        '& pre code': {
                          bgcolor: 'transparent',
                          p: 0,
                          fontSize: '0.9em',
                        },
                        '& table': {
                          display: 'block',
                          maxWidth: '100%',
                          overflowX: 'auto',
                          borderCollapse: 'collapse',
                          my: 1.75,
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.18 : 0.64),
                        },
                        '& th, & td': {
                          borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.16)}`,
                          borderRight: `1px solid ${alpha(theme.palette.success.main, 0.16)}`,
                          px: 1.4,
                          py: 1,
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.5,
                        },
                        '& th': {
                          bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
                          color: softText(theme, 'success'),
                          fontWeight: 800,
                        },
                        '& tr:last-child td': {
                          borderBottom: 0,
                        },
                        '& th:last-child, & td:last-child': {
                          borderRight: 0,
                        },
                        '& .contains-task-list': {
                          listStyle: 'none',
                          pl: 0,
                        },
                        '& .task-list-item': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        },
                        '& .katex': {
                          fontSize: '1.04em',
                        },
                        '& .katex-display': {
                          m: '14px 0 18px',
                          maxWidth: '100%',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.22 : 0.72),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                          borderRadius: 2,
                          px: 1.75,
                          py: 1.25,
                        },
                        '& .katex-display > .katex': {
                          fontSize: '1.08em',
                        },
                        '& hr': {
                          border: 0,
                          borderTop: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                          my: 2,
                        },
                      }}
                    >
                      <ChatMarkdownRenderer content={msg.content} />
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, justifyContent: 'flex-start', width: '100%', animation: reduceMotion ? 'none' : 'slideUpFadeIn 0.3s ease-out forwards' }}>
              <Box
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  borderRadius: '40%',
                  background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.5,
                  boxShadow: `0 4px 10px ${alpha(theme.palette.success.main, 0.2)}`
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: accentText(theme, 'success') }} />
              </Box>
              <Box sx={{ pt: 1.5 }}>
                <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center', bgcolor: softBg(theme, 'success', 0.12), px: 2, py: 1.5, borderRadius: '4px 24px 24px 24px' }}>
                  {[0, 150, 300].map((delay) => (
                    <Box key={delay} sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: 'success.main',
                      animation: reduceMotion ? 'none' : 'bounce 1s infinite cubic-bezier(0.4, 0, 0.2, 1)',
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
  );
}

export default EnsiklopediaMessagesView;
