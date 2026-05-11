'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CloudIcon from '@mui/icons-material/Cloud';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useTranslations } from 'next-intl';

interface MobileNavItem {
  key: string;
  icon: ReactNode;
  path: string;
}

const mobileNavItems: MobileNavItem[] = [
  { key: 'dashboard',  icon: <DashboardIcon />,            path: '/dashboard' },
  { key: 'keuangan',   icon: <AccountBalanceWalletIcon />, path: '/dashboard/keuangan' },
  { key: 'stok',       icon: <InventoryIcon />,            path: '/dashboard/stok' },
  { key: 'kabarPasar', icon: <NewspaperIcon />,            path: '/dashboard/kabar-pasar' },
  { key: 'cuaca',      icon: <CloudIcon />,                path: '/dashboard/cuaca' },
];

export default function MobileBottomNav() {
  const t = useTranslations('MobileNav');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    mobileNavItems.forEach((item) => {
      router.prefetch(item.path);
    });
  }, [router]);

  const currentValue = mobileNavItems.findIndex((item) => {
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
        aria-label="Navigasi Utama"
        value={currentValue === -1 ? false : currentValue}
        onChange={(_, newValue) => {
          const item = mobileNavItems[newValue];
          if (item && pathname !== item.path) {
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
              fontSize: '0.7rem',
              minWidth: 0,
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
