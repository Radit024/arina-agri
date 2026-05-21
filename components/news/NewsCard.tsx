'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLocale, useTranslations } from 'next-intl';
import { alpha } from '@mui/material/styles';
import type { NewsArticle } from '@/lib/types/news';

// ─── Helpers ──────────────────────────────────────────────────────
type KabarPasarTranslator = ReturnType<typeof useTranslations>;

function formatRelativeDate(dateStr: string, t: KabarPasarTranslator, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return t('relativeDate.justNow');
  if (diffHours < 24) return t('relativeDate.hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('relativeDate.yesterday');
  if (diffDays < 7) return t('relativeDate.daysAgo', { count: diffDays });
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// ─── Image Fallback ───────────────────────────────────────────────
function NewsImageFallback({ size }: { size: 'widget' | 'full' }) {
  return (
    <Box
      sx={{
        width: size === 'widget' ? 72 : '100%',
        // Use aspectRatio 16/9 for full to match real images and prevent CLS
        aspectRatio: size === 'widget' ? undefined : '16/9',
        height: size === 'widget' ? 72 : undefined,
        flexShrink: 0,
        bgcolor: (theme) => theme.palette.success.light,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size === 'widget' ? 1.5 : '12px 12px 0 0',
      }}
    >
      <NewspaperIcon sx={{ fontSize: size === 'widget' ? 28 : 40, color: 'primary.main', opacity: 0.4 }} />
    </Box>
  );
}

// ─── Widget Card (horizontal, compact) ───────────────────────────
function WidgetCard({ article }: { article: NewsArticle }) {
  const t = useTranslations('KabarPasar');
  const locale = useLocale();
  const [imgError, setImgError] = useState(false);
  const formattedDate = formatRelativeDate(article.pub_date, t, locale);

  return (
    <Card
      elevation={0}
      sx={{
        border: 'none',
        boxShadow: '0 4px 12px rgba(44, 42, 41, 0.04)',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(44, 42, 41, 0.08)',
        },
      }}
    >
      {/* Thumbnail */}
      {article.image_url && !imgError ? (
        <Box
          component="img"
          src={article.image_url}
          alt={article.title}
          onError={() => setImgError(true)}
          sx={{
            width: 72,
            height: 72,
            flexShrink: 0,
            objectFit: 'cover',
            alignSelf: 'center',
            m: 1.25,
            borderRadius: 1.5,
          }}
        />
      ) : (
        <Box sx={{ m: 1.25, alignSelf: 'center' }}>
          <NewsImageFallback size="widget" />
        </Box>
      )}

      {/* Content */}
      <CardContent sx={{ flex: 1, py: 1.25, px: 1, '&:last-child': { pb: 1.25 }, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 0.75,
            fontSize: '0.85rem'
          }}
        >
          {article.title}
        </Typography>

        {/* Footer: source + date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {article.source ? (
            <Chip
              label={article.source}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: 'success.light',
                color: 'primary.dark',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ) : null}
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
            {formattedDate}
          </Typography>
        </Box>

        {/* CTA */}
        {article.link !== '#' ? (
          <Button
            component="a"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
            sx={{
              mt: 0.75,
              p: 0,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'primary.main',
              textTransform: 'none',
              minWidth: 0,
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            {t('readShort')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Full Card (vertical, rich) ───────────────────────────────────
function FullCard({ article }: { article: NewsArticle }) {
  const t = useTranslations('KabarPasar');
  const locale = useLocale();
  const [imgError, setImgError] = useState(false);
  const formattedDate = formatRelativeDate(article.pub_date, t, locale);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette.divider, 0.6),
        boxShadow: 'none',
        borderRadius: 4,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.22s ease-out, box-shadow 0.22s ease-out',
        '&:hover': {
          boxShadow: '0 8px 28px rgba(44, 42, 41, 0.1)',
          transform: 'translateY(-3px)',
        },
      }}
    >
      {/* Thumbnail */}
      {article.image_url && !imgError ? (
        <Box
          component="img"
          src={article.image_url}
          alt={article.title}
          onError={() => setImgError(true)}
          sx={{
            width: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
          }}
        />
      ) : (
        <NewsImageFallback size="full" />
      )}

      {/* Content */}
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, '&:last-child': { pb: 2 } }}>
        
        {/* Source + date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
          {article.source ? (
            <Chip
              label={article.source}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                color: 'success.dark',
                borderRadius: 1.5,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ) : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
            <CalendarTodayIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {formattedDate}
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: 'var(--font-sora)',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
            color: 'text.primary',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 0.75,
          }}
        >
          {article.title}
        </Typography>

        {article.snippet ? (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.55,
              fontSize: '0.875rem',
              flex: 1,
              mb: 1,
            }}
          >
            {article.snippet}
          </Typography>
        ) : null}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* CTA Button — min touch target 44px via py */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 0.5 }}>
          <Button
            component="a"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            disableRipple
            endIcon={<ArrowForwardIcon sx={{ transition: 'transform 0.2s ease-out', fontSize: '0.875rem !important' }} />}
            disabled={article.link === '#'}
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              px: 0,
              py: 0.75,
              minHeight: 44,
              minWidth: 'auto',
              '&:hover': {
                bgcolor: 'transparent',
                color: 'primary.dark',
                '& .MuiButton-endIcon': {
                  transform: 'translateX(5px)',
                },
              },
            }}
          >
            {t('readMore')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton Loaders ─────────────────────────────────────────────
export function NewsCardSkeleton({ variant }: { variant: 'widget' | 'full' }) {
  if (variant === 'widget') {
    return (
      <Card
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', height: 96 }}
      >
        <Skeleton variant="rectangular" width={72} sx={{ m: 1.25, borderRadius: 1.5, flexShrink: 0 }} />
        <CardContent sx={{ flex: 1, py: 1.25, px: 1, '&:last-child': { pb: 1.25 } }}>
          <Skeleton variant="text" height={16} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" height={16} width="80%" sx={{ mb: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}
    >
      <Skeleton variant="rectangular" width="100%" sx={{ aspectRatio: '16/9' }} />
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
        <Skeleton variant="text" height={24} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={24} width="85%" sx={{ mb: 1 }} />
        <Skeleton variant="text" height={16} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={16} width="90%" sx={{ mb: 1 }} />
        <Skeleton variant="text" width={80} height={20} sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  );
}

import { memo } from 'react';

// ─── Main Export ──────────────────────────────────────────────────
interface NewsCardProps {
  article: NewsArticle;
  variant?: 'widget' | 'full';
}

function NewsCardComponent({ article, variant = 'full' }: NewsCardProps) {
  if (variant === 'widget') return <WidgetCard article={article} />;
  return <FullCard article={article} />;
}

export default memo(NewsCardComponent);
