'use client';

import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CloudIcon from '@mui/icons-material/Cloud';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import GrassIcon from '@mui/icons-material/Grass';
import { farmerProfile } from '@/lib/mockData';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Pencatatan Keuangan', icon: <AccountBalanceWalletIcon />, path: '/dashboard/keuangan' },
  { label: 'Notifikasi Cuaca', icon: <CloudIcon />, path: '/dashboard/cuaca' },
  { label: 'Ensiklopedia AI', icon: <AutoStoriesIcon />, path: '/dashboard/ensiklopedia' },
  { label: 'Smart Kalender', icon: <CalendarMonthIcon />, path: '/dashboard/kalender' },
  { label: 'Pengaturan', icon: <SettingsIcon />, path: '/dashboard/pengaturan' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: '1px 0 20px 0 rgb(0 0 0 / 0.06)',
          backgroundColor: '#ffffff',
        },
      }}
    >
      {/* Logo Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
          px: 3,
          py: 2.5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative leaf circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            right: 20,
            width: 70,
            height: 70,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Logo */}
        <Box className="flex items-center gap-2.5" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GrassIcon sx={{ color: '#ffffff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: '#ffffff',
                fontFamily: 'var(--font-sora)',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              ARINA
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, letterSpacing: '0.05em' }}
            >
              Agri Platform
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 2, overflow: 'auto' }}>
        <List dense>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                <Tooltip title={item.label} placement="right" arrow disableHoverListener>
                  <ListItemButton
                    onClick={() => router.push(item.path)}
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      backgroundColor: active ? 'primary.light' : 'transparent',
                      '&:hover': {
                        backgroundColor: active ? 'primary.light' : '#f8fafc',
                      },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: active ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: {
                          style: {
                            fontSize: '0.875rem',
                            fontWeight: active ? 600 : 500,
                            color: active ? 'inherit' : undefined,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        },
                      }}
                      sx={{ color: active ? 'primary.main' : 'text.primary' }}
                    />
                    {active && (
                      <Box
                        sx={{
                          width: 4,
                          height: 20,
                          borderRadius: 2,
                          backgroundColor: 'primary.main',
                          ml: 1,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider />

      {/* User Profile */}
      <Box className="flex items-center gap-3 px-4 py-3">
        <Avatar
          sx={{
            width: 38,
            height: 38,
            backgroundColor: 'primary.light',
            color: 'primary.main',
            fontSize: '0.875rem',
            fontWeight: 700,
          }}
        >
          BS
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {farmerProfile.nama}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {farmerProfile.komoditas} · {farmerProfile.luasLahan}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}

export { DRAWER_WIDTH };
