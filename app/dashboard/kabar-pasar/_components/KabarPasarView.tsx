import type { ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { PageHeader, PageShell } from '@/components/shared/page';
import NewsCard, { NewsCardSkeleton } from '@/components/news/NewsCard';
import { PriceTrendChart } from '@/components/dashboard/PriceCharts';
import type { NewsArticle } from '@/lib/types/news';
import { accentText, softBg, softHoverBg, softText } from '@/lib/themeColors';

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
    <PageShell>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={(
          <Tooltip title={t('refetch')}>
            <IconButton
              data-guide-target="market-refresh"
              onClick={onRefetch}
              size="small"
              aria-label={t('refetch')}
              sx={(theme) => ({
                minWidth: 44,
                minHeight: 44,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                color: 'text.secondary',
                '&:hover': { bgcolor: softBg(theme, 'success', 0.16), color: softText(theme, 'success') },
              })}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
        meta={!isLoading && total > 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Chip
              label={t('stats', { total })}
              size="small"
              sx={(theme) => ({
                bgcolor: softBg(theme, 'success', 0.16),
                color: softText(theme, 'success'),
                fontWeight: 600,
                fontSize: '0.75rem',
              })}
            />
            <Typography variant="caption" color="text.disabled">
              {t('updateInterval')}
            </Typography>
          </Box>
        ) : undefined}
      />

      <Box data-guide-target="market-price-chart" sx={{ mb: 4 }}>
        <PriceTrendChart />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700, color: 'text.primary' }}>
          {t('latestSectionTitle')}
        </Typography>

        <Stack
          data-guide-target="market-categories"
          direction="row"
          spacing={1}
          sx={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: 1,
            maxWidth: '100%',
            width: 'fit-content',
            '& > *': { flexShrink: 0 },
          }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat.value}
              label={t(cat.key)}
              onClick={() => onCategoryChange(cat.value)}
              variant={activeCategory === cat.value ? 'filled' : 'outlined'}
              data-touch-target="44"
              sx={(theme) => ({
                fontWeight: 600,
                fontSize: '0.85rem',
                minHeight: 40,
                px: 1,
                cursor: 'pointer',
                borderRadius: 2,
                borderColor: activeCategory === cat.value ? 'primary.main' : 'divider',
                bgcolor: activeCategory === cat.value ? 'primary.main' : 'transparent',
                color: activeCategory === cat.value ? accentText(theme, 'primary') : theme.palette.text.secondary,
                transition: 'all 0.18s ease-out',
                '&:hover': {
                  bgcolor: activeCategory === cat.value ? 'primary.dark' : softHoverBg(theme, 'success'),
                  borderColor: 'primary.main',
                  color: activeCategory === cat.value ? accentText(theme, 'primary') : softText(theme, 'success'),
                },
              })}
            />
          ))}
        </Stack>
      </Box>

      {error ? (
        <Card
          elevation={0}
          sx={(theme) => ({
            border: '1px solid',
            borderColor: softText(theme, 'error'),
            borderRadius: 3,
            mb: 3,
            bgcolor: softBg(theme, 'error', 0.14),
          })}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
            <Box>
              <Typography variant="subtitle2" sx={(theme) => ({ color: softText(theme, 'error'), fontWeight: 700 })}>
                Gagal memuat berita pasar
              </Typography>
              <Typography variant="body2" sx={(theme) => ({ color: softText(theme, 'error'), mt: 0.25 })}>
                {t('error', { error })}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              onClick={onRefetch}
              startIcon={<RefreshIcon />}
              data-touch-target="44"
              sx={{ minHeight: 44, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              {t('refetch')}
            </Button>
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
                    fontFamily: 'var(--font-sora)',
                    fontWeight: 600,
                  },
                }}
              />
            </Box>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
