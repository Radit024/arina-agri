'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import NewsCard, { NewsCardSkeleton } from '@/components/news/NewsCard';
import { useNews } from '@/hooks/useNews';
import { PriceTrendChart } from '@/components/dashboard/PriceCharts';
import { useTranslations } from 'next-intl';

const ITEMS_PER_PAGE = 16;

const CATEGORIES = [
  { key: 'categories.all', value: '' },
  { key: 'categories.price', value: 'harga' },
  { key: 'categories.weather', value: 'cuaca' },
  { key: 'categories.policy', value: 'kebijakan' },
  { key: 'categories.farmingTips', value: 'tips' },
  { key: 'categories.market', value: 'pasar' },
];

export default function KabarPasarPage() {
  const t = useTranslations('KabarPasar');
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('');

  const { articles, total, isLoading, error, refetch } = useNews({
    limit: ITEMS_PER_PAGE,
    page,
    category: activeCategory,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (value: string) => {
    setActiveCategory(value);
    setPage(1);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <NewspaperIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'var(--font-sora)',
                  color: 'text.primary',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {t('title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t('subtitle')}
              </Typography>
            </Box>
          </Box>

          <Tooltip title={t('refetch')}>
            <IconButton
              onClick={refetch}
              size="small"
              aria-label={t('refetch')}
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'success.light', color: 'primary.main' } }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats bar */}
        {!isLoading && total > 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Chip
              label={t('stats', { total })}
              size="small"
              sx={{
                bgcolor: 'success.light',
                color: 'primary.dark',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
            <Typography variant="caption" color="text.disabled">
              {t('updateInterval')}
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* ─── Price Trend Chart (Map) ─────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <PriceTrendChart />
      </Box>

      {/* ─── Section Divider & Category Filter ──────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'text.primary', fontSize: '1.1rem' }}>
          {t('latestSectionTitle')}
        </Typography>
        
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: 'wrap',
            gap: 1,
            '& > *': { flexShrink: 0 },
          }}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.value}
              label={t(cat.key)}
              onClick={() => handleCategoryChange(cat.value)}
              variant={activeCategory === cat.value ? 'filled' : 'outlined'}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.8125rem',
                height: 32,
                cursor: 'pointer',
                borderColor: activeCategory === cat.value ? 'primary.main' : 'divider',
                bgcolor: activeCategory === cat.value ? 'primary.main' : 'transparent',
                color: activeCategory === cat.value ? 'white' : 'text.secondary',
                transition: 'all 0.18s ease-out',
                '&:hover': {
                  bgcolor: activeCategory === cat.value ? 'primary.dark' : 'success.light',
                  borderColor: 'primary.main',
                  color: activeCategory === cat.value ? 'white' : 'primary.dark',
                },
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ─── Error State ──────────────────────────────────────────── */}
      {error ? (
        <Card
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 3, mb: 3, bgcolor: 'error.lighter' }}
        >
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="error.dark" sx={{ fontWeight: 600 }}>
              {t('error', { error })}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {/* ─── Content Grid ─────────────────────────────────────────── */}
      {isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <NewsCardSkeleton variant="full" />
            </Grid>
          ))}
        </Grid>
      ) : articles.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 4,
            bgcolor: 'background.default',
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <NewspaperIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }} gutterBottom>
              {t('empty.title')}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 360, mx: 'auto' }}>
              {t('empty.subtitle')}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={3}>
            {articles.map((article, i) => (
              <Grid
                key={article.id}
                size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                sx={{
                  // Stagger entrance animation, respects prefers-reduced-motion
                  animation: 'fadeInUp 0.35s ease-out both',
                  animationDelay: `${i * 35}ms`,
                  '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                  },
                }}
              >
                <NewsCard article={article} variant="full" />
              </Grid>
            ))}
          </Grid>

          {/* ─── Pagination ───────────────────────────────────────── */}
          {totalPages > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontWeight: 500,
                  },
                  '& .Mui-selected': {
                    bgcolor: 'primary.main !important',
                    color: 'white',
                    fontWeight: 700,
                  },
                }}
              />
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
