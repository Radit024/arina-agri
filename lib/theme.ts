import { createTheme } from '@mui/material/styles';

const baseTheme = createTheme({
  palette: {
    primary: {
      main: '#2D6A4F', // Forest Green
      dark: '#1B4332',
      light: '#D8F3DC',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E07A5F', // Terracotta
      contrastText: '#ffffff',
    },
    success: {
      main: '#52B788',
      light: '#D8F3DC',
      dark: '#2D6A4F',
    },
    warning: {
      main: '#F4E285', // Wheat
      light: '#FFF7D6',
      dark: '#B08C2C',
      contrastText: '#2C2A29', // Better contrast on yellow
    },
    error: {
      main: '#E07A5F', // Earthy Red/Orange
      light: '#FCDACF',
      dark: '#C85A3F',
    },
    info: {
      main: '#74A57F', // Sage Blue/Green
      light: '#E1EFE4',
      dark: '#4B7A56',
    },
    action: {
      hover: 'rgba(44, 42, 41, 0.04)',
      selected: 'rgba(45, 106, 79, 0.08)',
    },
    background: {
      default: '#FAFAF8', // Warm off-white
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C2A29', // Deep Charcoal
      secondary: '#6B6866', // Soft dark gray/brown
    },
    divider: '#EBEBE6',
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
    borderRadius: 16,
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
          borderRadius: 24,
          boxShadow: '0 8px 24px 0 rgba(44, 42, 41, 0.04), 0 2px 8px 0 rgba(44, 42, 41, 0.02)',
          border: '1px solid rgba(44, 42, 41, 0.04)',
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
