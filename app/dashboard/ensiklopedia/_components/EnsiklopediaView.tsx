'use client';

import { useState } from 'react';
import type { UseEnsiklopediaControllerResult } from '@/controllers/ensiklopedia/useEnsiklopediaController';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
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
import { useMessages } from 'next-intl';
import { PageActionButton } from '@/components/shared/page';
import EnsiklopediaMessagesView from './EnsiklopediaMessagesView';
import { accentText, softText } from '@/lib/themeColors';

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
      <EnsiklopediaMessagesView
        theme={theme}
        t={t}
        messages={messages}
        hasUserMessages={hasUserMessages}
        isTyping={isTyping}
        chatError={chatError}
        canRetryLastPrompt={canRetryLastPrompt}
        handleRetryLastPrompt={handleRetryLastPrompt}
        messagesEndRef={messagesEndRef}
        setInputValue={setInputValue}
        reduceMotion={reduceMotion}
      />

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
