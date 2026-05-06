import { createTheme } from '@mui/material/styles';

const baseTheme = createTheme({
  palette: {
    primary: {
      main: '#16a34a',
      dark: '#15803d',
      light: '#dcfce7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',
      light: '#dcfce7',
      dark: '#15803d',
    },
    warning: {
      main: '#f59e0b',
      light: '#fef3c7',
      dark: '#b45309',
    },
    error: {
      main: '#dc2626',
      light: '#fee2e2',
      dark: '#991b1b',
    },
    info: {
      main: '#2563eb',
      light: '#dbeafe',
      dark: '#1e40af',
    },
    action: {
      hover: 'rgba(15, 23, 42, 0.04)',
      selected: 'rgba(22, 163, 74, 0.08)',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    h1: { fontFamily: '"Sora", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Sora", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Sora", sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Sora", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Sora", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Sora", sans-serif', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
});

const theme = createTheme(baseTheme, {
  typography: {
    h3: {
      [baseTheme.breakpoints.down('sm')]: {
        fontSize: '1.75rem',
      },
    },
    h4: {
      [baseTheme.breakpoints.down('sm')]: {
        fontSize: '1.5rem',
      },
    },
    h5: {
      [baseTheme.breakpoints.down('sm')]: {
        fontSize: '1.25rem',
      },
    },
    h6: {
      [baseTheme.breakpoints.down('sm')]: {
        fontSize: '1.125rem',
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

export default theme;
