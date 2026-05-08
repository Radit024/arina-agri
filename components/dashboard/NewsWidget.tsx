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

export default function NewsWidget() {
  const router = useRouter();
  const { articles, isLoading } = useNews({ limit: 3, page: 1 });

  return (
    <Box sx={{ mt: 1 }}>
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
            Kabar Pasar
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
          Lihat Semua
        </Button>
      </Box>

      {/* Cards Grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
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
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <NewspaperIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Belum ada berita tersedia
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Berita akan muncul setelah sistem mengambil data dari RSS feed
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {articles.map((article) => (
            <Grid key={article.id} size={{ xs: 12, md: 4 }}>
              <NewsCard article={article} variant="widget" />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
