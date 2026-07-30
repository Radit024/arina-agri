'use client';

import { Children, Fragment, isValidElement, useRef, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { Controller } from 'react-hook-form';
import type {
  FeedbackMarkdownFormat,
  FeedbackModalControllerState,
} from '@/controllers/feedback/useFeedbackModalController';

function compactListItemChildren(children: ReactNode) {
  return Children.toArray(children).map((child, index) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === 'p') {
      return <Fragment key={child.key ?? index}>{child.props.children}</Fragment>;
    }

    return child;
  });
}

const feedbackMarkdownComponents: Components = {
  ol: ({ node, style, ...props }) => {
    void node;
    return (
      <ol
        {...props}
        style={{
          ...style,
          listStylePosition: 'outside',
          listStyleType: 'decimal',
          marginBottom: '0.625rem',
          marginTop: 0,
          paddingLeft: '1.5rem',
        }}
      />
    );
  },
  ul: ({ node, style, ...props }) => {
    void node;
    return (
      <ul
        {...props}
        style={{
          ...style,
          listStylePosition: 'outside',
          listStyleType: 'disc',
          marginBottom: '0.625rem',
          marginTop: 0,
          paddingLeft: '1.5rem',
        }}
      />
    );
  },
  li: ({ node, style, children, ...props }) => {
    void node;
    return (
      <li
        {...props}
        style={{
          ...style,
          marginBottom: '0.25rem',
          paddingLeft: '0.125rem',
          whiteSpace: 'normal',
        }}
      >
        {compactListItemChildren(children)}
      </li>
    );
  },
};

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`feedback-tabpanel-${index}`}
      aria-labelledby={`feedback-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function FeedbackMarkdown({ children }: { children: string }) {
  return (
    <Box
      sx={(theme) => ({
        color: 'text.primary',
        fontSize: '0.875rem',
        lineHeight: 1.55,
        overflowWrap: 'anywhere',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        '& > :first-of-type': { mt: 0 },
        '& > :last-child': { mb: 0 },
        '& p': { m: 0 },
        '& > p': { mb: 1 },
        '& ul, & ol': { mb: 1, mt: 0, pl: 3, whiteSpace: 'normal' },
        '& ul': { listStyleType: 'disc' },
        '& ol': { listStyleType: 'decimal' },
        '& li': { mb: 0.25, pl: 0.25, whiteSpace: 'normal' },
        '& li:last-child': { mb: 0 },
        '& strong': { color: 'text.primary', fontWeight: 800 },
        '& em': { color: 'text.primary' },
        '& h1, & h2, & h3': {
          fontFamily: 'var(--font-sora)',
          fontSize: '1rem',
          fontWeight: 800,
          lineHeight: 1.35,
          mb: 1,
        },
        '& blockquote': {
          borderLeft: `3px solid ${theme.palette.primary.main}`,
          color: 'text.secondary',
          m: 0,
          mb: 1.25,
          px: 1.5,
          py: 0.5,
        },
        '& code': {
          bgcolor: alpha(theme.palette.text.primary, 0.08),
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.85em',
          px: 0.5,
          py: 0.2,
        },
        '& pre': {
          bgcolor: alpha(theme.palette.text.primary, 0.08),
          borderRadius: '8px',
          maxWidth: '100%',
          overflowX: 'auto',
          p: 1.25,
        },
        '& pre code': {
          bgcolor: 'transparent',
          p: 0,
        },
        '& a': {
          color: 'primary.main',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        },
      })}
    >
      <ReactMarkdown components={feedbackMarkdownComponents}>{children}</ReactMarkdown>
    </Box>
  );
}

const formatButtonIcons: Record<FeedbackMarkdownFormat, ReactNode> = {
  bold: <FormatBoldIcon fontSize="small" />,
  italic: <FormatItalicIcon fontSize="small" />,
  bulletList: <FormatListBulletedIcon fontSize="small" />,
  numberedList: <FormatListNumberedIcon fontSize="small" />,
  quote: <FormatQuoteIcon fontSize="small" />,
  code: <CodeIcon fontSize="small" />,
};

export default function FeedbackModalView({
  control,
  errors,
  feedbacks,
  formatDate,
  getCategoryColor,
  getCategoryLabel,
  isFetching,
  isSubmitting,
  labels,
  messagePreview,
  onClose,
  onCloseSnackbar,
  onFormSubmit,
  onFormatMessage,
  onTabChange,
  open,
  snackbar,
  tabValue,
}: FeedbackModalControllerState) {
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const formatButtons: Array<{ format: FeedbackMarkdownFormat; label: string }> = [
    { format: 'bold', label: labels.formatting.bold },
    { format: 'italic', label: labels.formatting.italic },
    { format: 'bulletList', label: labels.formatting.bulletList },
    { format: 'numberedList', label: labels.formatting.numberedList },
    { format: 'quote', label: labels.formatting.quote },
    { format: 'code', label: labels.formatting.code },
  ];

  const handleFormatClick = (format: FeedbackMarkdownFormat) => {
    const input = messageInputRef.current;
    const selectionStart = input?.selectionStart ?? messagePreview.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;

    onFormatMessage(format, selectionStart, selectionEnd);
    window.requestAnimationFrame(() => input?.focus());
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={isSubmitting ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { minHeight: '60vh' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>{labels.title}</DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={onTabChange} aria-label="feedback tabs">
            <Tab label={labels.tabForm} id="feedback-tab-0" aria-controls="feedback-tabpanel-0" />
            <Tab label={labels.tabList} id="feedback-tab-1" aria-controls="feedback-tabpanel-1" />
          </Tabs>
        </Box>

        <DialogContent sx={{ pt: 0 }}>
          <CustomTabPanel value={tabValue} index={0}>
            <Box component="form" id="feedback-form" onSubmit={onFormSubmit} noValidate>
              <DialogContentText sx={{ mb: 3 }}>{labels.subtitle}</DialogContentText>

              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label={labels.fields.category}
                    margin="normal"
                    error={!!errors.category}
                    helperText={errors.category?.message}
                  >
                    <MenuItem value="bug">{labels.categories.bug}</MenuItem>
                    <MenuItem value="feature">{labels.categories.feature}</MenuItem>
                    <MenuItem value="question">{labels.categories.question}</MenuItem>
                  </TextField>
                )}
              />

              <Stack spacing={1.25} sx={{ mt: 2 }}>
                <Stack
                  direction="row"
                  spacing={0.5}
                  aria-label={labels.formatting.label}
                  sx={(theme) => ({
                    alignItems: 'center',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    px: 0.75,
                    py: 0.75,
                  })}
                >
                  {formatButtons.map((button) => (
                    <Tooltip key={button.format} title={button.label}>
                      <IconButton
                        type="button"
                        size="small"
                        aria-label={button.label}
                        data-touch-target="44"
                        onClick={() => handleFormatClick(button.format)}
                        sx={{
                          borderRadius: '8px',
                          height: 40,
                          width: 40,
                        }}
                      >
                        {formatButtonIcons[button.format]}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Stack>

                <Controller
                  name="message"
                  control={control}
                  render={({ field }) => {
                    const { ref, ...fieldProps } = field;

                    return (
                      <TextField
                        {...fieldProps}
                        fullWidth
                        multiline
                        rows={4}
                        label={labels.fields.message}
                        placeholder={labels.fields.messagePlaceholder}
                        error={!!errors.message}
                        helperText={errors.message?.message || labels.formatting.helper}
                        inputRef={(node) => {
                          ref(node);
                          messageInputRef.current = node;
                        }}
                      />
                    );
                  }}
                />

                <Box
                  aria-live="polite"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '8px',
                    maxHeight: 180,
                    minHeight: 104,
                    overflowY: 'auto',
                    px: 2,
                    py: 1.5,
                  })}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', fontWeight: 700, mb: 1 }}
                  >
                    {labels.formatting.previewTitle}
                  </Typography>
                  {messagePreview.trim() ? (
                    <FeedbackMarkdown>{messagePreview}</FeedbackMarkdown>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {labels.formatting.previewEmpty}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          </CustomTabPanel>

          <CustomTabPanel value={tabValue} index={1}>
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : feedbacks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography>{labels.emptyList}</Typography>
              </Box>
            ) : (
              <List sx={{ bgcolor: 'background.paper', width: '100%' }}>
                {feedbacks.map((fb, index) => (
                  <Fragment key={fb.id}>
                    <ListItem sx={{ display: 'block', px: 0, py: 2 }}>
                      <Box
                        sx={{
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: 1,
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Chip
                          label={getCategoryLabel(fb.category)}
                          size="small"
                          color={getCategoryColor(fb.category)}
                          variant="outlined"
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {fb.user_name ? `${fb.user_name} - ` : ''}
                          {formatDate(fb.created_at)}
                          {fb.device_type ? ` - ${fb.device_type}` : ''}
                        </Typography>
                      </Box>
                      <FeedbackMarkdown>{fb.message}</FeedbackMarkdown>
                    </ListItem>
                    {index < feedbacks.length - 1 && <Divider component="li" />}
                  </Fragment>
                ))}
              </List>
            )}
          </CustomTabPanel>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            {labels.cancel}
          </Button>
          {tabValue === 0 && (
            <Button
              type="submit"
              form="feedback-form"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? labels.submitting : labels.submit}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={onCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={onCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
