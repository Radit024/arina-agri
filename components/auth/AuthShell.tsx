import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import AuthBrandPanel from './AuthBrandPanel';

interface AuthShellProps {
  brandSubtitle: string;
  children: ReactNode;
  minHeight?: string;
}

export default function AuthShell({ brandSubtitle, children, minHeight = '100dvh' }: AuthShellProps) {
  return (
    <Grid container sx={{ minHeight }}>
      <AuthBrandPanel subtitle={brandSubtitle} />
      <Grid
        size={{ xs: 12, md: 6 }}
        component={Paper}
        elevation={0}
        square
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6, md: 8 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {children}
        </Box>
      </Grid>
    </Grid>
  );
}
