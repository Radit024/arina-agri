'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';

export interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export interface FeedbackItem {
  id: string;
  category: string;
  message: string;
  created_at: string;
  user_name?: string;
  device_type?: string;
}

export type FeedbackCategoryColor = 'default' | 'error' | 'primary' | 'info';
export type FeedbackMarkdownFormat = 'bold' | 'italic' | 'bulletList' | 'numberedList' | 'quote' | 'code';
export type FeedbackSnackbarSeverity = 'success' | 'error';

export interface FeedbackSnackbarState {
  open: boolean;
  message: string;
  severity: FeedbackSnackbarSeverity;
}

export interface FeedbackModalLabels {
  title: string;
  subtitle: string;
  fields: {
    category: string;
    message: string;
    messagePlaceholder: string;
  };
  categories: {
    bug: string;
    feature: string;
    question: string;
  };
  formatting: {
    label: string;
    bold: string;
    italic: string;
    bulletList: string;
    numberedList: string;
    quote: string;
    code: string;
    previewTitle: string;
    previewEmpty: string;
    helper: string;
  };
  cancel: string;
  tabForm: string;
  tabList: string;
  submit: string;
  submitting: string;
  emptyList: string;
}

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'question']),
  message: z.string().min(5, 'Pesan terlalu singkat'),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;

function normalizeSelection(value: string, selectionStart?: number, selectionEnd?: number) {
  const start = Math.max(0, Math.min(selectionStart ?? value.length, value.length));
  const end = Math.max(start, Math.min(selectionEnd ?? start, value.length));

  return { start, end };
}

function withLinePrefix(text: string, prefixForLine: (index: number) => string) {
  return text
    .split(/\r?\n/)
    .map((line, index) => {
      const cleaned = line.replace(/^([-*]\s+|\d+\.\s+|>\s?)/, '');
      return `${prefixForLine(index)}${cleaned || 'Tulis poin di sini'}`;
    })
    .join('\n');
}

export function applyMarkdownFormat(
  value: string,
  format: FeedbackMarkdownFormat,
  selectionStart?: number,
  selectionEnd?: number,
) {
  const { start, end } = normalizeSelection(value, selectionStart, selectionEnd);
  const selectedText = value.slice(start, end);

  const fallbackText: Record<FeedbackMarkdownFormat, string> = {
    bold: 'teks tebal',
    italic: 'teks miring',
    bulletList: 'Poin pertama\nPoin kedua',
    numberedList: 'Poin pertama\nPoin kedua',
    quote: 'Kutipan penting',
    code: 'kode',
  };

  const text = selectedText || fallbackText[format];
  let formatted = text;

  if (format === 'bold') {
    formatted = `**${text}**`;
  } else if (format === 'italic') {
    formatted = `_${text}_`;
  } else if (format === 'bulletList') {
    formatted = withLinePrefix(text, () => '- ');
  } else if (format === 'numberedList') {
    formatted = withLinePrefix(text, (index) => `${index + 1}. `);
  } else if (format === 'quote') {
    formatted = withLinePrefix(text, () => '> ');
  } else if (format === 'code') {
    formatted = text.includes('\n') ? `\`\`\`\n${text}\n\`\`\`` : `\`${text}\``;
  }

  return `${value.slice(0, start)}${formatted}${value.slice(end)}`;
}

export function useFeedbackModalController({ open, onClose }: FeedbackModalProps) {
  const t = useTranslations('FeedbackModal');
  const { session } = useAuth();
  const errorFetchMessage = t('errorFetch');

  const [tabValue, setTabValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackSnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const labels = useMemo<FeedbackModalLabels>(
    () => ({
      title: t('title'),
      subtitle: t('subtitle'),
      fields: {
        category: t('fields.category'),
        message: t('fields.message'),
        messagePlaceholder: t('fields.messagePlaceholder'),
      },
      categories: {
        bug: t('categories.bug'),
        feature: t('categories.feature'),
        question: t('categories.question'),
      },
      formatting: {
        label: t('formatting.label'),
        bold: t('formatting.bold'),
        italic: t('formatting.italic'),
        bulletList: t('formatting.bulletList'),
        numberedList: t('formatting.numberedList'),
        quote: t('formatting.quote'),
        code: t('formatting.code'),
        previewTitle: t('formatting.previewTitle'),
        previewEmpty: t('formatting.previewEmpty'),
        helper: t('formatting.helper'),
      },
      cancel: t('cancel'),
      tabForm: t('tabForm'),
      tabList: t('tabList'),
      submit: t('submit'),
      submitting: t('submitting'),
      emptyList: t('emptyList'),
    }),
    [t],
  );

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: 'bug',
      message: '',
    },
  });

  const messagePreview = useWatch({ control: form.control, name: 'message' });
  const accessToken = session?.access_token || '';

  const fetchFeedbacks = useCallback(async () => {
    setIsFetching(true);

    try {
      const response = await fetch('/api/feedback', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Gagal memuat masukan');

      const resData = await response.json();
      setFeedbacks(resData.data || []);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: errorFetchMessage, severity: 'error' });
    } finally {
      setIsFetching(false);
    }
  }, [accessToken, errorFetchMessage]);

  useEffect(() => {
    if (open && tabValue === 1) {
      void fetchFeedbacks();
    }
  }, [fetchFeedbacks, open, tabValue]);

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const submitFeedback: SubmitHandler<FeedbackFormValues> = async (data) => {
    setIsSubmitting(true);

    try {
      const deviceType = window.innerWidth <= 768 ? 'mobile' : 'desktop';

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...data,
          device_type: deviceType,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengirim feedback');
      }

      setSnackbar({ open: true, message: t('success'), severity: 'success' });
      form.reset();
      setTabValue(1);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: t('error'), severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleFormatMessage = useCallback(
    (format: FeedbackMarkdownFormat, selectionStart?: number, selectionEnd?: number) => {
      const currentMessage = form.getValues('message') || '';
      const nextMessage = applyMarkdownFormat(currentMessage, format, selectionStart, selectionEnd);

      form.setValue('message', nextMessage, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const getCategoryColor = (category: string): FeedbackCategoryColor => {
    if (category === 'bug') return 'error';
    if (category === 'feature') return 'primary';
    if (category === 'question') return 'info';
    return 'default';
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'bug') return labels.categories.bug;
    if (category === 'feature') return labels.categories.feature;
    if (category === 'question') return labels.categories.question;
    return category;
  };

  const formatDate = (dateString: string) => {
    const locale = t('locale') || 'id';
    const date = new Date(dateString);

    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return {
    control: form.control,
    errors: form.formState.errors,
    feedbacks,
    formatDate,
    getCategoryColor,
    getCategoryLabel,
    isFetching,
    isSubmitting,
    labels,
    messagePreview,
    onClose,
    onCloseSnackbar: handleCloseSnackbar,
    onFormSubmit: form.handleSubmit(submitFeedback),
    onFormatMessage: handleFormatMessage,
    onTabChange: handleTabChange,
    open,
    snackbar,
    tabValue,
  };
}

export type FeedbackModalControllerState = ReturnType<typeof useFeedbackModalController>;
