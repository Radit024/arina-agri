'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NewsCard, { NewsCardSkeleton } from '@/components/news/NewsCard';
import { useNews } from '@/hooks/useNews';
import { useTranslations } from 'next-intl';

interface NewsWidgetProps {
  layout?: 'horizontal' | 'vertical';
}

export default function NewsWidget({ layout = 'vertical' }: NewsWidgetProps) {
  const router = useRouter();
  const t = useTranslations('KabarPasar');
  const limitCount = layout === 'vertical' ? 6 : 3;
  const { articles, isLoading } = useNews({ limit: limitCount, page: 1 });

  return (
    <Box sx={{ mt: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewspaperIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'var(--font-sora)',
              fontWeight: 700,
              color: 'text.primary',
              fontSize: '1rem',
            }}
          >
            {t('title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', ml: 0.5 }}>
            📰
          </Typography>
        </Box>

        <Button
          size="small"
          endIcon={<ArrowForwardIcon fontSize="small" />}
          onClick={() => router.push('/dashboard/kabar-pasar')}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: 'primary.main',
            fontSize: '0.8rem',
            '&:hover': { bgcolor: 'success.light' },
          }}
        >
          {t('viewAll')}
        </Button>
      </Box>

      {/* Cards Grid */}
      <Box sx={layout === 'vertical' ? { 
        maxHeight: 380, 
        overflowY: 'auto', 
        pr: 1, 
        pb: 1,
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(0,0,0,0.2)' }
      } : {}}>
        {isLoading ? (
          <Grid container spacing={1.5}>
            {Array.from({ length: limitCount }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, md: layout === 'horizontal' ? 4 : 12 }}>
                <NewsCardSkeleton variant="widget" />
              </Grid>
            ))}
          </Grid>
        ) : articles.length === 0 ? (
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: 'background.default',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <NewspaperIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t('empty.title')}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {t('empty.subtitle')}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={1.5}>
            {articles.map((article) => (
              <Grid key={article.id} size={{ xs: 12, md: layout === 'horizontal' ? 4 : 12 }}>
                <NewsCard article={article} variant="widget" />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
