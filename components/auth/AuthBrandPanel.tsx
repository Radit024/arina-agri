import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

interface AuthBrandPanelProps {
  subtitle: string;
}

export default function AuthBrandPanel({ subtitle }: AuthBrandPanelProps) {
  return (
    <Grid
      size={{ xs: 12, md: 6 }}
      sx={{
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: 'primary.light', opacity: 0.1 }} />
      <Box sx={{ position: 'absolute', bottom: -150, right: -100, width: 500, height: 500, borderRadius: '50%', bgcolor: 'primary.dark', opacity: 0.2 }} />
      <Box
        component="img"
        src="/logo%20arina.svg"
        alt="Arina Agri Logo"
        sx={{ width: 80, height: 80, mb: 2, zIndex: 1, filter: 'brightness(0) invert(1)' }}
      />
      <Typography variant="h3" sx={{ fontFamily: 'var(--font-sora)', zIndex: 1, textAlign: 'center', fontWeight: 800 }}>
        Arina Agri
      </Typography>
      <Typography variant="h6" sx={{ mt: 2, opacity: 0.9, textAlign: 'center', maxWidth: 400, zIndex: 1 }}>
        {subtitle}
      </Typography>
    </Grid>
  );
}
