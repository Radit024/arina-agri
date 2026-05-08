'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import NewsCard, { NewsCardSkeleton } from '@/components/news/NewsCard';
import { useNews } from '@/hooks/useNews';

const ITEMS_PER_PAGE = 9;

export default function KabarPasarPage() {
  const [page, setPage] = useState(1);
  const { articles, total, isLoading, error, refetch } = useNews({
    limit: ITEMS_PER_PAGE,
    page,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    // Smooth scroll ke atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                Kabar Pasar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Berita &amp; informasi harga komoditas pertanian terkini
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Muat ulang berita">
            <IconButton
              onClick={refetch}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'success.light', color: 'primary.main' } }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats bar */}
        {!isLoading && total > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Chip
              label={`${total} artikel tersedia`}
              size="small"
              sx={{
                bgcolor: 'success.light',
                color: 'primary.dark',
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            />
            <Typography variant="caption" color="text.disabled">
              Diperbarui otomatis setiap 6 jam dari sumber terpercaya
            </Typography>
          </Box>
        )}
      </Box>

      {/* ─── Error State ──────────────────────────────────────────── */}
      {error && (
        <Card
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'warning.light', borderRadius: 3, mb: 3, bgcolor: 'warning.light' }}
        >
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="warning.dark" sx={{ fontWeight: 600 }}>
              ⚠️ Gagal memuat berita terbaru — menampilkan contoh data
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ─── Content Grid ─────────────────────────────────────────── */}
      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
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
            borderRadius: 3,
            bgcolor: 'background.default',
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <NewspaperIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }} gutterBottom>
              Belum ada berita tersedia
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 360, mx: 'auto' }}>
              Sistem akan otomatis mengambil berita pertanian terbaru dari RSS feed setiap 6 jam sekali
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {articles.map((article) => (
              <Grid key={article.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <NewsCard article={article} variant="full" />
              </Grid>
            ))}
          </Grid>

          {/* ─── Pagination ───────────────────────────────────────── */}
          {totalPages > 1 && (
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
          )}
        </>
      )}
    </Box>
  );
}
