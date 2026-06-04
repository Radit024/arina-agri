import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { softBg } from '@/lib/themeColors';

interface AuthBrandPanelProps {
  subtitle: string;
}

export default function AuthBrandPanel({ subtitle }: AuthBrandPanelProps) {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignSelf: 'stretch',
        minHeight: { md: 560 },
        p: { md: 4, lg: 5 },
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '32px',
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette.divider, 0.74),
        bgcolor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.26 : 0.54),
        boxShadow: (theme) => `0 22px 64px ${alpha(theme.palette.primary.dark, theme.palette.mode === 'dark' ? 0.18 : 0.08)}`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.72,
          backgroundImage: (theme) => `repeating-linear-gradient(0deg, transparent 0px, transparent 30px, ${alpha(theme.palette.primary.main, 0.1)} 31px, transparent 32px), repeating-linear-gradient(90deg, transparent 0px, transparent 44px, ${alpha(theme.palette.success.main, 0.08)} 45px, transparent 46px)`,
        }}
      />
      <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
        <Box
          sx={{
            width: 74,
            height: 74,
            borderRadius: '22px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.22),
            boxShadow: (theme) => `0 16px 34px ${alpha(theme.palette.primary.dark, 0.1)}`,
          }}
        >
          <Box component="img" src="/logo%20arina.svg" alt="Arina Agri Logo" sx={{ width: 46, height: 46 }} />
        </Box>
        <Box>
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'var(--font-sora)',
              color: 'text.primary',
              fontWeight: 800,
              letterSpacing: 0,
              lineHeight: 1.04,
            }}
          >
            Arina Agri
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              color: 'text.secondary',
              maxWidth: 420,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      <Stack
        aria-hidden
        spacing={1.5}
        sx={{
          position: 'absolute',
          right: { md: 34, lg: 46 },
          bottom: { md: 34, lg: 46 },
          width: { md: 220, lg: 260 },
          opacity: 0.72,
        }}
      >
        {[0, 1, 2].map((item) => (
          <Box
            key={item}
            sx={{
              height: 12,
              width: `${100 - item * 16}%`,
              borderRadius: '999px',
              bgcolor: (theme) => item === 1 ? softBg(theme, 'warning', 0.18) : softBg(theme, 'primary', 0.18),
              border: '1px solid',
              borderColor: (theme) => alpha(item === 1 ? theme.palette.warning.dark : theme.palette.primary.main, 0.18),
              alignSelf: item === 2 ? 'flex-end' : 'flex-start',
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
