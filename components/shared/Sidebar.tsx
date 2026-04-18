'use client';

import { useCallback, useEffect, useState } from 'react';
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
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';

import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

import { farmerProfile } from '@/lib/mockData';
import { useTranslations } from 'next-intl';

const DRAWER_WIDTH_OPEN = 280;
const DRAWER_WIDTH_CLOSED = 88;

const navItems = [
  { key: 'dashboard', icon: <DashboardOutlinedIcon />, path: '/dashboard' },
  { key: 'keuangan', icon: <AccountBalanceWalletOutlinedIcon />, path: '/dashboard/keuangan' },
  { key: 'cuaca', icon: <CloudOutlinedIcon />, path: '/dashboard/cuaca' },
  { key: 'ensiklopedia', icon: <AutoStoriesOutlinedIcon />, path: '/dashboard/ensiklopedia' },
  { key: 'kalender', icon: <CalendarMonthOutlinedIcon />, path: '/dashboard/kalender' },
];

export default function Sidebar() {
  const t = useTranslations('Sidebar');
  const [isOpen, setIsOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.path);
    });
    router.prefetch('/dashboard/pengaturan');
  }, [router]);

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  const handleToggleSidebar = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setIsProfileDropdownOpen(false);
      }
      return next;
    });
  }, []);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isOpen ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        transition: 'width 0.25s ease-in-out',
        willChange: 'width',
        '& .MuiDrawer-paper': {
          width: isOpen ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_CLOSED,
          transition: 'width 0.25s ease-in-out',
          willChange: 'width',
          contain: 'layout paint',
          boxSizing: 'border-box',
          borderRight: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            opacity: isOpen ? 1 : 0,
            width: isOpen ? 'auto' : 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.2s, width 0.2s',
          }}
        >
          <Box
            component="img"
            src="/logo%20arina.svg"
            alt="Logo Arina Agri"
            sx={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <Typography variant="h6" sx={{ color: '#064e3b', letterSpacing: '-0.5px', fontWeight: 800 }}>
            Arina Agri
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleToggleSidebar} sx={{ color: '#064e3b' }}>
          <ViewSidebarIcon />
        </IconButton>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 2, mt: 1 }}>
        <List sx={{ pt: 0 }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            const navButton = (
              <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => {
                    if (pathname !== item.path) {
                      router.push(item.path);
                    }
                  }}
                  sx={{
                    borderRadius: 3,
                    py: 1.2,
                    minHeight: 48,
                    justifyContent: isOpen ? 'initial' : 'center',
                    bgcolor: active ? '#f0fdf4' : 'transparent',
                    '&:hover': { bgcolor: active ? '#f0fdf4' : '#f8fafc' },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isOpen ? 2 : 'auto',
                      justifyContent: 'center',
                      color: active ? 'primary.dark' : '#475569',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.key)}
                    sx={{
                      display: isOpen ? 'block' : 'none',
                      opacity: isOpen ? 1 : 0,
                      transition: 'opacity 0.2s',
                      m: 0,
                    }}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: '0.875rem',
                          fontWeight: active ? 600 : 500,
                          color: active ? '#16a34a' : '#475569',
                        },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );

            if (isOpen) {
              return navButton;
            }

            return (
              <Tooltip key={item.path} title={t(item.key)} placement="right" arrow>
                {navButton}
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Bottom Area */}
      <Box sx={{ p: 2 }}>
        {isOpen && <Divider sx={{ mb: 2, mx: 1 }} />}

        {isOpen && (
          <Collapse in={isProfileDropdownOpen} timeout="auto" unmountOnExit>
            <List sx={{ p: 0.5 }}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => router.push(pathname + '?settings=true&tab=general')}
                  sx={{ borderRadius: 3, py: 1, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: '#64748b' }}>
                    <SettingsOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('pengaturan')}
                    slotProps={{ primary: { sx: { fontSize: '0.82rem', fontWeight: 600, color: '#475569' } } }}
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => router.push('/')}
                  sx={{ borderRadius: 3, py: 1, '&:hover': { bgcolor: '#fef2f2' } }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: '#dc2626' }}>
                    <LogoutOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('logout')}
                    slotProps={{ primary: { sx: { fontSize: '0.82rem', fontWeight: 600, color: '#dc2626' } } }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>
        )}

        {/* User Profile */}
        <ListItemButton
          onClick={() => {
            if (isOpen) {
              setIsProfileDropdownOpen((prev) => !prev);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: isOpen ? 1.5 : 1,
            mb: 1,
            borderRadius: 4,
            bgcolor: '#f4fbf4', // Light green bg for profile like reference
            justifyContent: isOpen ? 'space-between' : 'center',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: '#ecf5ee' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#9ca3af', // Grayish avatar like the image
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {farmerProfile.nama.substring(0, 2).toUpperCase()}
            </Avatar>
            {isOpen && (
              <Box>
                <Typography variant="body2" sx={{ color: '#064e3b', lineHeight: 1.2, fontWeight: 700 }}>
                  {farmerProfile.nama}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                  {t('farmer')}
                </Typography>
              </Box>
            )}
          </Box>
          {isOpen && (
            <Box sx={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
              {isProfileDropdownOpen ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </Box>
          )}
        </ListItemButton>
      </Box>
    </Drawer>
  );
}
