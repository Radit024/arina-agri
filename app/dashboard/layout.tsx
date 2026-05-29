import Box from '@mui/material/Box';
import DashboardChrome from '@/components/shared/DashboardChrome';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, minHeight: '100dvh' }}>
      {/* Fix #5: Skip-to-main-content link for keyboard/screen reader accessibility */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed',
          top: -56,
          left: 8,
          zIndex: 9999,
          bgcolor: 'primary.main',
          color: 'white',
          px: 2.5,
          py: 1,
          borderRadius: 2,
          fontWeight: 700,
          fontSize: '0.875rem',
          textDecoration: 'none',
          '&:focus': {
            top: 8,
          },
          transition: 'top 0.2s ease-in-out',
        }}
      >
        Lewati ke konten utama
      </Box>

      <DashboardChrome>{children}</DashboardChrome>
    </Box>
  );
}
