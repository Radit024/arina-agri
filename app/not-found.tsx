'use client';

import Link from 'next/link';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import HomeIcon from '@mui/icons-material/Home';

export default function NotFound() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 50%, #ffffff 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Circles / Aesthetic Shapes */}
      <Box sx={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', backgroundColor: alpha(theme.palette.success.main, 0.08) }} />
      <Box sx={{ position: 'absolute', bottom: -150, right: -50, width: 500, height: 500, borderRadius: '50%', backgroundColor: alpha(theme.palette.success.main, 0.05) }} />
      <Box sx={{ position: 'absolute', top: '20%', right: '15%', width: 100, height: 100, borderRadius: '50%', backgroundColor: alpha(theme.palette.success.dark, 0.1) }} />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          {/* Custom SVG Illustration for 404 (Tractor / Leaf) */}
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: 'white',
              boxShadow: '0 20px 40px rgba(22,163,74,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="68" height="68" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path opacity="0.2" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill={theme.palette.success.main}/>
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill={theme.palette.success.dark}/>
              {/* Plant leaf accents simulating agriculture theme */}
              <path d="M19 5C19 5 21 8 20 10C19 12 16 11 16 11C16 11 15 8 16 6C17 4 19 5 19 5Z" fill={theme.palette.success.light} opacity="0.8"/>
              <path d="M5 5C5 5 3 8 4 10C5 12 8 11 8 11C8 11 9 8 8 6C7 4 5 5 5 5Z" fill={theme.palette.success.light} opacity="0.8"/>
            </svg>
          </Box>
        </Box>

        <Typography 
           variant="h1" 
           sx={{ 
             fontFamily: 'var(--font-sora)',
             fontSize: { xs: '6rem', md: '8rem' },
             background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
             WebkitBackgroundClip: 'text',
             WebkitTextFillColor: 'transparent',
             lineHeight: 1,
             fontWeight: 900,
           }}
        >
          404
        </Typography>

        <Typography variant="h5" sx={{ mt: 2, mb: 1.5, color: theme.palette.success.dark, fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
          Halaman Tidak Ditemukan!
        </Typography>

        <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 5, maxWidth: 400, mx: 'auto', lineHeight: 1.6 }}>
          Sepertinya traktor kami salah belok arah. Lahan web yang Anda cari belum ditanami atau alamat yang diakses keliru.
        </Typography>

        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            size="large"
            sx={{ 
              borderRadius: 8, 
              px: 4, 
              py: 1.5, 
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'none',
              boxShadow: `0 10px 25px ${alpha(theme.palette.success.main, 0.3)}`,
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 15px 35px ${alpha(theme.palette.success.main, 0.4)}`,
              },
              transition: 'all 0.3s ease-in-out'
            }}
          >
            Kembali ke Dashboard
          </Button>
        </Link>
      </Container>
    </Box>
  );
}
