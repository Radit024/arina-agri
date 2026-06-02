import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import DashboardSkeleton from './_components/DashboardSkeleton';

export default function DashboardLoading() {
  return (
    <Box sx={{ p: { xs: 2, md: 4, lg: 5 }, maxWidth: '1600px', mx: 'auto' }}>
      <Box role="status" aria-live="polite" sx={{ mb: 3 }}>
        <LinearProgress color="success" sx={{ height: 4, borderRadius: 999, mb: 1.5 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Menyiapkan dashboard...
        </Typography>
      </Box>
      <DashboardSkeleton />
    </Box>
  );
}
