import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

export default function DashboardSkeleton() {
  return (
    <>
      <Box sx={{ mb: 5 }}>
        <Skeleton variant="text" width={160} height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={220} height={40} />
      </Box>

      <Card sx={{ mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 4, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 3 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Skeleton variant="text" width={140} height={22} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </>
  );
}
