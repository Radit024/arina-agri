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
import type { NewsArticle } from '@/lib/types/news';

// ─── Helpers ──────────────────────────────────────────────────────
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Baru saja';
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', {
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
        width: size === 'widget' ? 88 : '100%',
        height: size === 'widget' ? 88 : 180,
        flexShrink: 0,
        bgcolor: 'success.light',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size === 'widget' ? 2 : '12px 12px 0 0',
      }}
    >
      <NewspaperIcon sx={{ fontSize: size === 'widget' ? 32 : 48, color: 'primary.main', opacity: 0.5 }} />
    </Box>
  );
}

// ─── Widget Card (horizontal, compact) ───────────────────────────
function WidgetCard({ article }: { article: NewsArticle }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        height: '100%',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 4px 16px rgba(22,163,74,0.10)',
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
            width: 88,
            height: 88,
            flexShrink: 0,
            objectFit: 'cover',
            alignSelf: 'center',
            m: 1.5,
            borderRadius: 2,
          }}
        />
      ) : (
        <Box sx={{ m: 1.5, alignSelf: 'center' }}>
          <NewsImageFallback size="widget" />
        </Box>
      )}

      {/* Content */}
      <CardContent sx={{ flex: 1, py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 }, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 0.5,
          }}
        >
          {article.title}
        </Typography>

        {article.snippet && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              mb: 1,
            }}
          >
            {article.snippet}
          </Typography>
        )}

        {/* Footer: source + date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {article.source && (
            <Chip
              label={article.source}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: 'success.light',
                color: 'primary.dark',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          )}
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
            {formatRelativeDate(article.pub_date)}
          </Typography>
        </Box>

        {/* CTA */}
        {article.link !== '#' && (
          <Button
            component="a"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.7rem !important' }} />}
            sx={{
              mt: 0.75,
              p: 0,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'primary.main',
              textTransform: 'none',
              minWidth: 0,
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            Baca di sumber
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Full Card (vertical, rich) ───────────────────────────────────
function FullCard({ article }: { article: NewsArticle }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 8px 24px rgba(22,163,74,0.12)',
          transform: 'translateY(-2px)',
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
            height: 180,
            objectFit: 'cover',
          }}
        />
      ) : (
        <NewsImageFallback size="full" />
      )}

      {/* Content */}
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, '&:last-child': { pb: 2 } }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1,
          }}
        >
          {article.title}
        </Typography>

        {article.snippet && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.6,
              flex: 1,
              mb: 1.5,
            }}
          >
            {article.snippet}
          </Typography>
        )}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Source + date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {article.source && (
            <Chip
              label={article.source}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: 'success.light',
                color: 'primary.dark',
                '& .MuiChip-label': { px: 1.5 },
              }}
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
            <CalendarTodayIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
              {formatRelativeDate(article.pub_date)}
            </Typography>
          </Box>
        </Box>

        {/* CTA Button */}
        <Button
          component="a"
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="small"
          fullWidth
          endIcon={<OpenInNewIcon fontSize="small" />}
          disabled={article.link === '#'}
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'success.light',
              borderColor: 'primary.dark',
            },
          }}
        >
          Baca Selengkapnya di Sumber
        </Button>
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
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', height: 120 }}
      >
        <Skeleton variant="rectangular" width={88} sx={{ m: 1.5, borderRadius: 2, flexShrink: 0 }} />
        <CardContent sx={{ flex: 1, py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Skeleton variant="text" height={16} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" height={16} width="80%" sx={{ mb: 1 }} />
          <Skeleton variant="text" height={12} width="60%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
    >
      <Skeleton variant="rectangular" width="100%" height={180} />
      <CardContent sx={{ p: 2 }}>
        <Skeleton variant="text" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={20} width="85%" sx={{ mb: 1.5 }} />
        <Skeleton variant="text" height={14} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={14} width="90%" sx={{ mb: 0.5 }} />
        <Skeleton variant="text" height={14} width="70%" sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={32} sx={{ borderRadius: 2 }} />
      </CardContent>
    </Card>
  );
}

// ─── Main Export ──────────────────────────────────────────────────
interface NewsCardProps {
  article: NewsArticle;
  variant?: 'widget' | 'full';
}

export default function NewsCard({ article, variant = 'full' }: NewsCardProps) {
  if (variant === 'widget') return <WidgetCard article={article} />;
  return <FullCard article={article} />;
}
