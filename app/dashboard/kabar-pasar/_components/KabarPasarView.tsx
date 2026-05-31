import type { ChangeEvent } from 'react';
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
import { PriceTrendChart } from '@/components/dashboard/PriceCharts';
import type { NewsArticle } from '@/lib/types/news';

type KabarPasarTranslator = (key: string, values?: Record<string, string | number>) => string;

interface CategoryOption {
  key: string;
  value: string;
}

interface KabarPasarViewProps {
  activeCategory: string;
  articles: NewsArticle[];
  categories: CategoryOption[];
  error: string | null;
  isLoading: boolean;
  itemsPerPage: number;
  page: number;
  t: KabarPasarTranslator;
  total: number;
  totalPages: number;
  onCategoryChange: (value: string) => void;
  onPageChange: (_: ChangeEvent<unknown>, value: number) => void;
  onRefetch: () => void;
}

export default function KabarPasarView({
  activeCategory,
  articles,
  categories,
  error,
  isLoading,
  itemsPerPage,
  page,
  t,
  total,
  totalPages,
  onCategoryChange,
  onPageChange,
  onRefetch,
}: KabarPasarViewProps) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
              data-guide-target="market-refresh"
              onClick={onRefetch}
              size="small"
              aria-label={t('refetch')}
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'success.light', color: 'primary.main' } }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

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

      <Box data-guide-target="market-price-chart" sx={{ mb: 4 }}>
        <PriceTrendChart />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600, color: 'text.primary', fontSize: '1.1rem' }}>
          {t('latestSectionTitle')}
        </Typography>

        <Stack
          data-guide-target="market-categories"
          direction="row"
          spacing={1}
          sx={{
            flexWrap: 'wrap',
            gap: 1,
            '& > *': { flexShrink: 0 },
          }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat.value}
              label={t(cat.key)}
              onClick={() => onCategoryChange(cat.value)}
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

      {isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: itemsPerPage }).map((_, i) => (
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
          <Grid data-guide-target="market-news-grid" container spacing={3}>
            {articles.map((article, i) => (
              <Grid
                key={article.id}
                size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                sx={{
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

          {totalPages > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={onPageChange}
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
