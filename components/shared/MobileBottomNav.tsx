'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CloudIcon from '@mui/icons-material/Cloud';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslations } from 'next-intl';

interface MobileNavItem {
  key: string;
  icon: ReactNode;
  path: string;
  type?: 'route' | 'settings';
}

const mobileNavItems: MobileNavItem[] = [
  { key: 'dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { key: 'keuangan', icon: <AccountBalanceWalletIcon />, path: '/dashboard/keuangan' },
  { key: 'cuaca', icon: <CloudIcon />, path: '/dashboard/cuaca' },
  { key: 'ensiklopedia', icon: <AutoStoriesIcon />, path: '/dashboard/ensiklopedia' },
  { key: 'kalender', icon: <CalendarMonthIcon />, path: '/dashboard/kalender' },
  { key: 'pengaturan', icon: <SettingsIcon />, path: '/dashboard/pengaturan', type: 'settings' },
];

export default function MobileBottomNav() {
  const t = useTranslations('MobileNav');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSettingsOpen = searchParams.get('settings') === 'true';

  useEffect(() => {
    mobileNavItems.forEach((item) => {
      router.prefetch(item.path);
    });
  }, [router]);

  const currentValue = mobileNavItems.findIndex((item) => {
    if (item.type === 'settings') {
      return isSettingsOpen || pathname === '/dashboard/pengaturan';
    }
    if (item.path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(item.path);
  });

  return (
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
        value={currentValue === -1 ? 0 : currentValue}
        onChange={(_, newValue) => {
          const item = mobileNavItems[newValue];
          if (item.type === 'settings') {
            const next = `${pathname}?settings=true&tab=general`;
            const current = `${pathname}?${searchParams.toString()}`;
            if (current !== next) {
              router.push(next);
            }
            return;
          }
          if (pathname !== item.path) {
            router.push(item.path);
          }
        }}
        sx={{ height: 64, px: 0.5 }}
      >
        {mobileNavItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={t(item.key)}
            icon={item.icon}
            sx={{
              '&.Mui-selected': {
                color: 'primary.main',
              },
              fontSize: '0.65rem',
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
