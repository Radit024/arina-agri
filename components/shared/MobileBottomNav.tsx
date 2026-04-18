'use client';

import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CloudIcon from '@mui/icons-material/Cloud';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const mobileNavItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Keuangan', icon: <AccountBalanceWalletIcon />, path: '/dashboard/keuangan' },
  { label: 'Cuaca', icon: <CloudIcon />, path: '/dashboard/cuaca' },
  { label: 'Ensiklopedia', icon: <AutoStoriesIcon />, path: '/dashboard/ensiklopedia' },
  { label: 'Kalender', icon: <CalendarMonthIcon />, path: '/dashboard/kalender' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

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
      }}
      elevation={0}
    >
      <BottomNavigation
        value={currentValue === -1 ? 0 : currentValue}
        onChange={(_, newValue) => {
          router.push(mobileNavItems[newValue].path);
        }}
        sx={{ height: 64 }}
      >
        {mobileNavItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
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
