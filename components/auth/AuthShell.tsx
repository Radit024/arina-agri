import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import AuthBrandPanel from './AuthBrandPanel';

interface AuthShellProps {
  brandSubtitle: string;
  children: ReactNode;
  minHeight?: string;
}

export default function AuthShell({ brandSubtitle, children, minHeight = '100dvh' }: AuthShellProps) {
  return (
    <Box
        component="main"
        aria-label="Autentikasi Arina Agri"
        sx={{
          minHeight,
          position: 'relative',
          overflow: 'hidden',
          overflowX: 'hidden',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          px: { xs: 2, sm: 3, lg: 4 },
          py: { xs: 3, sm: 5, md: 4 },
          bgcolor: 'background.default',
          background: (theme) => theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${theme.palette.background.default} 52%, ${alpha(theme.palette.success.main, 0.14)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.74)} 0%, ${theme.palette.background.default} 48%, ${alpha(theme.palette.success.light, 0.58)} 100%)`,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: { xs: 0.45, md: 0.72 },
            backgroundImage: (theme) => `repeating-linear-gradient(124deg, ${alpha(theme.palette.primary.main, 0.12)} 0px, ${alpha(theme.palette.primary.main, 0.12)} 1px, transparent 1px, transparent 46px)`,
          },
          '& .MuiTextField-root': {
            minWidth: 0,
            '& .MuiInputLabel-root': {
              color: 'text.secondary',
              fontWeight: 700,
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'primary.main',
            },
          },
          '& .MuiOutlinedInput-root': {
            minHeight: 52,
            borderRadius: '999px',
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.88),
            transition: 'background-color 160ms ease, box-shadow 160ms ease',
            '& fieldset': {
              borderColor: 'divider',
              transition: 'border-color 160ms ease, box-shadow 160ms ease',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 1,
              borderColor: 'primary.main',
              boxShadow: (theme) => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
            },
            '&.Mui-error fieldset': {
              borderColor: 'error.main',
            },
            '& .MuiInputBase-input': {
              py: 1.45,
              fontSize: '0.94rem',
            },
          },
          '& .MuiFormHelperText-root': {
            mx: 1.75,
            mt: 0.75,
          },
          '& .MuiTypography-root, & a, & form': {
            minWidth: 0,
            overflowWrap: 'break-word',
          },
          '& .MuiInputAdornment-root .MuiSvgIcon-root': {
            fontSize: 20,
          },
          '& .MuiIconButton-root': {
            color: 'text.secondary',
          },
          '& .MuiButton-root': {
            minHeight: 48,
            borderRadius: '999px',
            boxShadow: 'none',
            letterSpacing: 0,
            '&:hover': {
              boxShadow: 'none',
            },
          },
          '& .MuiButton-contained': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
          '& .MuiButton-outlined': {
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.48),
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.68),
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1),
            },
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            minWidth: 0,
            maxWidth: 1120,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.9fr) minmax(360px, 450px)', lg: 'minmax(0, 1fr) minmax(390px, 480px)' },
            gap: { xs: 3, md: 4, lg: 6 },
            alignItems: 'center',
          }}
        >
          <AuthBrandPanel subtitle={brandSubtitle} />
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              minWidth: 0,
              maxWidth: { xs: '100%', sm: 440, md: 'none' },
              mx: 'auto',
              p: { xs: 3, sm: 4, md: 4.5 },
              borderRadius: { xs: '28px', sm: '32px' },
              border: '1px solid',
              borderColor: (theme) => alpha(theme.palette.divider, 0.9),
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? `0 24px 70px ${alpha(theme.palette.common.black, 0.44)}, 0 4px 18px ${alpha(theme.palette.common.black, 0.28)}`
                : `0 24px 70px ${alpha(theme.palette.primary.dark, 0.14)}, 0 4px 18px ${alpha(theme.palette.primary.dark, 0.06)}`,
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: '0 0 auto',
                height: 6,
                bgcolor: 'primary.main',
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 2.5, md: 3 } }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '18px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.22),
                }}
              >
                <Box component="img" src="/logo%20arina.svg" alt="" sx={{ width: 34, height: 34 }} />
              </Box>
            </Box>
            <Box sx={{ width: '100%', minWidth: 0, maxWidth: { xs: '100%', sm: 400 }, mx: 'auto' }}>
              {children}
            </Box>
          </Paper>
        </Box>
      </Box>
  );
}
