import { createTheme } from '@mui/material/styles';

// ─── Shared Design Tokens ─────────────────────────────────────────────────────
const sharedTokens = {
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
};

// ─── Light Theme (Day / Warm Off-White) ───────────────────────────────────────
const lightBase = createTheme({
  ...sharedTokens,
  palette: {
    mode: 'light',
    primary:    { main: '#2D6A4F', dark: '#1B4332', light: '#D8F3DC', contrastText: '#ffffff' },
    secondary:  { main: '#E07A5F', contrastText: '#2C2A29' },
    success:    { main: '#52B788', light: '#D8F3DC', dark: '#2D6A4F', contrastText: '#ffffff' },
    warning:    { main: '#F4E285', light: '#FFF7D6', dark: '#B08C2C', contrastText: '#2C2A29' },
    error:      { main: '#E07A5F', light: '#FCDACF', dark: '#C85A3F', contrastText: '#2C2A29' },
    info:       { main: '#74A57F', light: '#E1EFE4', dark: '#4B7A56', contrastText: '#2C2A29' },
    action:     { hover: 'rgba(44, 42, 41, 0.04)', selected: 'rgba(45, 106, 79, 0.08)' },
    background: { default: '#FAFAF8', paper: '#FFFFFF' },
    text:       { primary: '#2C2A29', secondary: '#6B6866' },
    divider:    '#EBEBE6',
  },
});

export const lightTheme = createTheme(lightBase, {
  typography: {
    h3: { [lightBase.breakpoints.down('sm')]: { fontSize: '1.75rem' } },
    h4: { [lightBase.breakpoints.down('sm')]: { fontSize: '1.5rem' } },
    h5: { [lightBase.breakpoints.down('sm')]: { fontSize: '1.25rem' } },
    h6: { [lightBase.breakpoints.down('sm')]: { fontSize: '1.125rem' } },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 16,
          fontWeight: 700,
          fontSize: '1rem',
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },
    MuiCard: {
      // Kartu sengaja rata tanpa bayangan: konsistensi dengan
      // `components/ui/Card.tsx`, yang tidak lagi mengunci token sendiri.
      styleOverrides: {
        root: {
          borderRadius: 32,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' } },
    },
  },
});

// ─── Dark Theme — Option G: "Slate Garden" (Soft Dark) ───────────────────────
const darkBase = createTheme({
  ...sharedTokens,
  palette: {
    mode: 'dark',
    primary:    { main: '#52B788', dark: '#3A9A70', light: '#68C99A', contrastText: '#1E2620' },
    secondary:  { main: '#D4836A', contrastText: '#1E2620' },
    success:    { main: '#68C99A', light: '#2A3E2F', dark: '#52B788', contrastText: '#1E2620' },
    warning:    { main: '#D4C060', light: '#35300A', dark: '#A89030', contrastText: '#1A1A10' },
    error:      { main: '#D4836A', light: '#3A2018', dark: '#B05A42', contrastText: '#1E2620' },
    info:       { main: '#7DB88A', light: '#1E2E22', dark: '#5A9068', contrastText: '#1E2620' },
    action:     { hover: 'rgba(82, 183, 136, 0.08)', selected: 'rgba(82, 183, 136, 0.12)' },
    background: { default: '#1E2620', paper: '#262D28' },
    text:       { primary: '#DDE8DF', secondary: '#8BA08E' },
    divider:    '#2E3830',
  },
});

export const darkTheme = createTheme(darkBase, {
  typography: {
    h3: { [darkBase.breakpoints.down('sm')]: { fontSize: '1.75rem' } },
    h4: { [darkBase.breakpoints.down('sm')]: { fontSize: '1.5rem' } },
    h5: { [darkBase.breakpoints.down('sm')]: { fontSize: '1.25rem' } },
    h6: { [darkBase.breakpoints.down('sm')]: { fontSize: '1.125rem' } },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 16,
          fontWeight: 700,
          fontSize: '1rem',
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: darkBase.palette.background.default,
          color: darkBase.palette.text.primary,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 32,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' } },
    },
  },
});

// Default export tetap untuk backward-compat (light)
export default lightTheme;
