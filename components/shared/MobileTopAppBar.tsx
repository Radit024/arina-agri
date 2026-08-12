'use client';

import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

const titleMap: Array<{ prefix: string; key: string }> = [
  { prefix: '/dashboard/keuangan', key: 'keuangan' },
  { prefix: '/dashboard/cuaca', key: 'cuaca' },
  { prefix: '/dashboard/ensiklopedia', key: 'ensiklopedia' },
  { prefix: '/dashboard/kalender', key: 'kalender' },
  { prefix: '/dashboard/stok', key: 'stok' },
  { prefix: '/dashboard/kabar-pasar', key: 'kabarPasar' },
  { prefix: '/dashboard', key: 'dashboard' },
];

export default function MobileTopAppBar() {
  const t = useTranslations('MobileNav');
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const titleKey = titleMap.find((item) => pathname.startsWith(item.prefix))?.key ?? 'dashboard';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        display: { xs: 'block', md: 'none' },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 56, px: 2, gap: 1 }}>
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={titleKey}
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ willChange: 'opacity, transform' }}
            >
              <Typography
                variant="subtitle1"
                component="h1"
                sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}
              >
                {t(titleKey)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}
              >
                {t((titleKey + '_subtitle') as Parameters<typeof t>[0])}
              </Typography>
            </motion.div>
          </AnimatePresence>
        </Box>

      </Toolbar>
    </AppBar>
  );
}
