'use client';

import { useCallback, useState } from 'react';
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
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

import { farmerProfile } from '@/lib/mockData';

const DRAWER_WIDTH_OPEN = 280;
const DRAWER_WIDTH_CLOSED = 88;

const navItems = [
  { label: 'Dashboard', icon: <DashboardOutlinedIcon />, path: '/dashboard' },
  { label: 'Pencatatan Keuangan', icon: <AccountBalanceWalletOutlinedIcon />, path: '/dashboard/keuangan' },
  { label: 'Cuaca', icon: <CloudOutlinedIcon />, path: '/dashboard/cuaca' },
  { label: 'Ensiklopedia AI', icon: <AutoStoriesOutlinedIcon />, path: '/dashboard/ensiklopedia' },
  { label: 'Smart Kalender', icon: <CalendarMonthOutlinedIcon />, path: '/dashboard/kalender' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

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
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Custom SVG logo based on reference */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22h20L12 2zm0 3.83L18.17 20H5.83L12 5.83z" fill="white" />
              <circle cx="12" cy="15" r="3" fill="white" />
            </svg>
          </Box>
          <Typography variant="h6" sx={{ color: '#064e3b', letterSpacing: '-0.5px', fontWeight: 800 }}>
            Arina
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
                  onClick={() => router.push(item.path)}
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
                    primary={item.label}
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
              <Tooltip key={item.path} title={item.label} placement="right" arrow>
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
                  onClick={() => router.push(pathname + '?settings=true&tab=profil')}
                  sx={{ borderRadius: 3, py: 1, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: '#64748b' }}>
                    <MenuBookOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Edit Profile"
                    slotProps={{ primary: { sx: { fontSize: '0.82rem', fontWeight: 600, color: '#475569' } } }}
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => router.push(pathname + '?settings=true&tab=general')}
                  sx={{ borderRadius: 3, py: 1, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: '#64748b' }}>
                    <SettingsOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Pengaturan"
                    slotProps={{ primary: { sx: { fontSize: '0.82rem', fontWeight: 600, color: '#475569' } } }}
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
                  Farmer
                </Typography>
              </Box>
            )}
          </Box>
          {isOpen && (
            <Box sx={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
              {isProfileDropdownOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Box>
          )}
        </ListItemButton>
      </Box>
    </Drawer>
  );
}
