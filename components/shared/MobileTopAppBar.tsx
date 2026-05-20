'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';

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
      <Toolbar sx={{ minHeight: 56, px: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t(titleKey)}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
      </Toolbar>
    </AppBar>
  );
}
