'use client';

import { useState } from 'react';
import type { UseEnsiklopediaControllerResult } from '@/controllers/ensiklopedia/useEnsiklopediaController';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EmojiNatureOutlinedIcon from '@mui/icons-material/EmojiNatureOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CustomSpaIcon from '@mui/icons-material/SpaOutlined'; // Using a similar icon
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { useMessages } from 'next-intl';
import { PageActionButton } from '@/components/shared/page';
import { accentText, softBg, softText } from '@/lib/themeColors';

interface QuickReferenceDisease {
  id: string;
  name: string;
  severity: string;
  loss: string | number;
  cause: string;
  symptoms: string;
  treatment: string;
}

type EncyclopediaMessages = {
  Encyclopedia?: {
    quickReference?: {
      diseases?: QuickReferenceDisease[];
    };
  };
};

export default function EnsiklopediaView({
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
  canRetryLastPrompt,
}: UseEnsiklopediaControllerResult) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const intlMessages = useMessages() as EncyclopediaMessages;
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const isMoreOpen = Boolean(moreAnchorEl);

  return (
    <Box
      sx={{
        height: {
          xs: 'calc(100dvh - 56px - 84px - env(safe-area-inset-bottom))',
          md: '100dvh',
        },
        minHeight: { xs: 0, md: '100dvh' },
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >

      {/* Header custom (bukan PageHeader): halaman ini adalah chat shell sticky, bukan halaman data biasa. */}
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
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2 }}>
              Arina AI
            </Typography>
          </Box>
        </Box>

        {/* Right Side: Actions */}
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, alignItems: 'center' }}>
          {/* New Chat */}
          <PageActionButton
            aria-label={t('newChat')}
            data-touch-target="44"
            variant="contained"
            startIcon={<AddCommentOutlinedIcon />}
            onClick={handleNewChat}
            size="small"
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              fontWeight: 700,
              px: 2,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {t('newChat')}
          </PageActionButton>
          <Tooltip title={t('newChat')}>
            <IconButton
              aria-label={t('newChat')}
              data-touch-target="44"
              onClick={handleNewChat}
              size="small"
              sx={{
                display: { xs: 'flex', sm: 'none' },
                minHeight: 44,
                minWidth: 44,
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.14) },
              }}
            >
              <AddCommentOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Desktop/Tablet: Quick Reference */}
          <PageActionButton
            data-guide-target="ai-quick-reference"
            data-touch-target="44"
            variant="text"
            startIcon={<BugReportOutlinedIcon />}
            onClick={() => setDiseaseModalOpen(true)}
            size="small"
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05), color: 'text.primary' },
            }}
          >
            {t('quickReference.title')}
          </PageActionButton>

          {/* History Drawer Trigger */}
          <PageActionButton
            aria-label={t('historyOpen')}
            data-touch-target="44"
            variant="outlined"
            startIcon={<HistoryIcon sx={{ mr: { xs: 0, sm: 0 } }} />}
            onClick={() => setHistoryDrawerOpen(true)}
            size="small"
            sx={{
              fontWeight: 600,
              px: { xs: 1.25, sm: 2 },
              minHeight: 44,
              minWidth: { xs: 44, sm: 'auto' },
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              borderColor: alpha(theme.palette.primary.main, 0.3),
              color: 'primary.main',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('historyTitle')}</Box>
          </PageActionButton>

          {/* Desktop/Tablet: Clear Chat */}
          <Tooltip title={t('currentChatClear')}>
            <IconButton
              aria-label={t('currentChatClear')}
              data-touch-target="44"
              onClick={handleClearChat}
              size="small"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                minHeight: 44,
                minWidth: 44,
                color: 'text.secondary',
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' },
              }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Mobile Overflow Menu (xs) */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
            <IconButton
              aria-label="Menu Aksi Tambahan"
              data-touch-target="44"
              onClick={(e) => setMoreAnchorEl(e.currentTarget)}
              size="small"
              sx={{
                minHeight: 44,
                minWidth: 44,
                color: 'text.secondary',
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={moreAnchorEl}
              open={isMoreOpen}
              onClose={() => setMoreAnchorEl(null)}
              slotProps={{
                paper: {
                  sx: { borderRadius: 2, minWidth: 200, boxShadow: theme.shadows[4] },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setMoreAnchorEl(null);
                  setDiseaseModalOpen(true);
                }}
                data-guide-target="ai-quick-reference"
                sx={{ minHeight: 44, py: 1 }}
              >
                <ListItemIcon sx={{ color: 'text.secondary', minWidth: 36 }}>
                  <BugReportOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t('quickReference.title')}
                  slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }}
                />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMoreAnchorEl(null);
                  handleClearChat();
                }}
                sx={{ minHeight: 44, py: 1, color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main', minWidth: 36 }}>
                  <DeleteOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t('currentChatClear')}
                  slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600, color: 'error.main' } } }}
                />
              </MenuItem>
            </Menu>
          </Box>
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
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
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
            <Box sx={{ mb: 1.5, maxWidth: '100%', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <Box
                data-guide-target="ai-quick-prompts"
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  maxWidth: '100%',
                  pb: 0.5,
                  px: 1,
                  width: 'fit-content',
                  '::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
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
                        transform: reduceMotion ? 'none' : 'translateY(-2px)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Input Box - Glassmorphism */}
          <Box
            data-guide-target="ai-chat-input"
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
                transform: reduceMotion ? 'none' : 'translateY(-2px)',
              }
            }}
          >
            <TextField
              fullWidth
              aria-label={t('inputLabel')}
              placeholder={t('inputPlaceholder')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={6}
              variant="standard"
              slotProps={{
                htmlInput: {
                  'aria-label': t('inputLabel'),
                },
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
              aria-label={isTyping ? t('sendingMessage') : t('sendMessage')}
              data-touch-target="44"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              sx={{
                bgcolor: inputValue.trim() && !isTyping ? 'success.main' : alpha(theme.palette.text.disabled, 0.1),
                color: inputValue.trim() && !isTyping ? accentText(theme, 'success') : 'text.disabled',
                width: 44,
                height: 44,
                borderRadius: '50%',
                '&:hover': {
                  bgcolor: inputValue.trim() && !isTyping ? 'success.dark' : alpha(theme.palette.text.disabled, 0.2),
                  transform: inputValue.trim() && !isTyping && !reduceMotion ? 'scale(1.03)' : 'none',
                },
                flexShrink: 0,
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                mb: 0.5,
                mr: 0.5
              }}
            >
              <SendIcon sx={{ fontSize: '1.2rem', ml: inputValue.trim() ? 0.5 : 0 }} />
            </IconButton>
          </Box>
          <Typography
            data-mobile-helper="desktop-only"
            variant="caption"
            sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'center', mt: 1, mb: 1, color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}
          >
            {t('composerHelper')}
          </Typography>
        </Box>
      </Box>

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
          <IconButton
            aria-label={t('quickReference.close')}
            data-touch-target="44"
            onClick={() => setDiseaseModalOpen(false)}
            size="small"
            sx={{ minHeight: 44, minWidth: 44, color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {((intlMessages?.Encyclopedia?.quickReference?.diseases || []) as QuickReferenceDisease[]).map((disease) => (
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
                        color: disease.severity === 'tinggi' ? softText(theme, 'error') : softText(theme, 'warning'),
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
                    <Typography variant="body2" sx={{ color: softText(theme, 'success'), fontWeight: 600, fontSize: '0.9rem' }}>
                      ✓ {disease.treatment}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

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
            {t('historyTitle')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {historyList.length > 0 && (
              <Tooltip title={t('historyClearAll')}>
                <IconButton
                  aria-label={t('historyClearAll')}
                  data-touch-target="44"
                  onClick={handleClearHistory}
                  size="small"
                  sx={{ minHeight: 44, minWidth: 44, color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' } }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              aria-label={t('historyClose')}
              data-touch-target="44"
              onClick={() => setHistoryDrawerOpen(false)}
              size="small"
              sx={{ minHeight: 44, minWidth: 44 }}
            >
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
              {t('historyEmpty')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {Object.entries(
              historyList.reduce((acc, session) => {
                const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const group = session.date === today ? t('historyToday') : t('historyPrevious');
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
                      sx={{
                        borderRadius: 2,
                        minHeight: 56,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        '&:hover': { 
                          bgcolor: alpha(theme.palette.success.main, 0.08),
                          '& .delete-icon': { opacity: 1, transform: 'scale(1)' }
                        }
                      }}
                    >
                      <ButtonBase
                        aria-label={`${session.preview}, ${session.date}, ${t('historyMessageCount', { count: session.messages.length })}`}
                        onClick={() => handleLoadHistory(session)}
                        sx={{
                          alignItems: 'stretch',
                          borderRadius: 2,
                          display: 'block',
                          minHeight: 56,
                          p: 1.5,
                          pr: 6,
                          textAlign: 'left',
                          width: '100%',
                          '&:focus-visible': {
                            outline: `3px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                            outlineOffset: 2,
                          },
                        }}
                      >
                        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.preview}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{session.date}</span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.palette.text.disabled }} />
                          <span>{t('historyMessageCount', { count: session.messages.length })}</span>
                        </Typography>
                      </ButtonBase>
                      <IconButton
                        className="delete-icon"
                        size="small"
                        aria-label={t('historyDeleteSession')}
                        data-touch-target="44"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteHistorySession(session.id);
                        }}
                        sx={{
                          position: 'absolute',
                          right: 6,
                          top: 6,
                          minHeight: 44,
                          minWidth: 44,
                          opacity: { xs: 1, sm: 0 },
                          transform: { xs: 'scale(1)', sm: 'scale(0.9)' },
                          transition: 'all 0.2s ease',
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) },
                          '&.Mui-focusVisible': {
                            opacity: 1,
                            transform: 'scale(1)',
                          },
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
