'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useTranslations } from 'next-intl';
import MobileFeatureSheet, {
  type MobileFeatureGroup,
  type MobileFeatureItem,
} from '@/components/shared/MobileFeatureSheet';

interface MobileNavItem {
  key: string;
  icon: ReactNode;
  path: string | null;
  opensSheet?: boolean;
}

const mobileNavItems: MobileNavItem[] = [
  { key: 'dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { key: 'keuangan',   icon: <AccountBalanceWalletIcon />, path: '/dashboard/keuangan' },
  { key: 'ensiklopedia', icon: <AutoStoriesOutlinedIcon />, path: '/dashboard/ensiklopedia' },
  { key: 'kalender', icon: <CalendarMonthOutlinedIcon />, path: '/dashboard/kalender' },
  { key: 'lainnya', icon: <MoreHorizIcon />, path: null, opensSheet: true },
];

const mobileFeatureGroups: MobileFeatureGroup[] = [
  {
    key: 'operasional',
    titleKey: 'operasional',
    items: [
      { key: 'stok', icon: <InventoryOutlinedIcon />, path: '/dashboard/stok' },
    ],
  },
  {
    key: 'informasi',
    titleKey: 'informasi',
    items: [
      { key: 'cuaca', icon: <CloudOutlinedIcon />, path: '/dashboard/cuaca' },
      { key: 'kabarPasar', icon: <NewspaperIcon />, path: '/dashboard/kabar-pasar' },
    ],
  },
  {
    key: 'pengaturan',
    titleKey: 'pengaturanSection',
    items: [
      { key: 'pengaturan', icon: <SettingsOutlinedIcon />, path: '/dashboard/pengaturan' },
    ],
  },
];

const prefetchPaths = Array.from(
  new Set([
    ...mobileNavItems
      .map((item) => item.path)
      .filter((path): path is string => Boolean(path)),
    ...mobileFeatureGroups
      .flatMap((group) => group.items)
      .map((item) => item.path)
      .filter((path): path is string => Boolean(path)),
  ])
);

export default function MobileBottomNav() {
  const t = useTranslations('MobileNav');
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showUnavailableToast, setShowUnavailableToast] = useState(false);
  const lainnyaButtonRef = useRef<HTMLButtonElement | null>(null);

  const lainnyaIndex = mobileNavItems.findIndex((item) => item.opensSheet);

  useEffect(() => {
    prefetchPaths.forEach((path) => {
      router.prefetch(path);
    });
  }, [router]);

  const focusLainnyaButton = () => {
    window.setTimeout(() => {
      lainnyaButtonRef.current?.focus();
    }, 0);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    focusLainnyaButton();
  };

  const navigateToPath = (path: string | null) => {
    if (!path) {
      setShowUnavailableToast(true);
      return;
    }

    if (pathname !== path) {
      router.push(path);
    }
  };

  const handleFeatureSelect = (item: MobileFeatureItem) => {
    setSheetOpen(false);
    if (!item.path || pathname === item.path) {
      focusLainnyaButton();
    }
    navigateToPath(item.path);
  };

  const currentValue = mobileNavItems.findIndex((item) => {
    if (!item.path) return false;
    if (item.path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(item.path);
  });

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: 'block', md: 'none' },
          zIndex: 1200,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          pb: 'env(safe-area-inset-bottom)',
        }}
        elevation={0}
      >
        <BottomNavigation
          aria-label="Navigasi Utama"
          value={currentValue === -1 ? lainnyaIndex : currentValue}
          onChange={(_, newValue) => {
            const item = mobileNavItems[newValue];
            if (!item) return;

            if (item.opensSheet) {
              setSheetOpen(true);
              return;
            }

            navigateToPath(item.path);
          }}
          sx={{ height: 64, px: 0.5 }}
        >
          {mobileNavItems.map((item) => (
            <BottomNavigationAction
              key={item.key}
              ref={item.opensSheet ? lainnyaButtonRef : undefined}
              label={t(item.key)}
              icon={item.icon}
              sx={{
                '&.Mui-selected': {
                  color: 'primary.main',
                },
                fontSize: '0.7rem',
                minWidth: 0,
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      <MobileFeatureSheet
        open={sheetOpen}
        title={t('featureMenuTitle')}
        closeLabel={t('closeFeatureMenu')}
        groups={mobileFeatureGroups}
        getLabel={t}
        onClose={handleCloseSheet}
        onSelect={handleFeatureSelect}
      />

      <Snackbar
        open={showUnavailableToast}
        autoHideDuration={3000}
        onClose={() => setShowUnavailableToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: '84px', md: 0 } }}
      >
        <Alert
          onClose={() => setShowUnavailableToast(false)}
          severity="info"
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {t('featureUnavailable')}
        </Alert>
      </Snackbar>
    </>
  );
}
