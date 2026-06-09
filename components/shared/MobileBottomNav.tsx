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
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import FeedbackModal from '@/components/shared/FeedbackModal';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { useGuide } from '@/components/shared/guide/GuideProvider';
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
      { key: 'guide', icon: <HelpOutlineOutlinedIcon />, path: null, action: 'guide' },
      { key: 'pengaturan', icon: <SettingsOutlinedIcon />, path: null, action: 'settings' },
      { key: 'beriMasukan', icon: <ChatBubbleOutlineOutlinedIcon />, path: null, action: 'feedback' },
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
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showUnavailableToast, setShowUnavailableToast] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const lainnyaButtonRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { openGuide } = useGuide();

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
    if (item.action === 'guide') {
      openGuide();
      return;
    }

    if (item.action === 'settings') {
      router.push(pathname + '?settings=true&tab=general');
      return;
    }

    if (item.action === 'feedback') {
      setIsFeedbackOpen(true);
      return;
    }

    if (item.action === 'feedback') {
      setIsFeedbackOpen(true);
      return;
    }

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
  const selectedIndex = currentValue === -1 ? lainnyaIndex : currentValue;

  const getMotionProps = (isSelected: boolean) => {
    if (reduceMotion) return {};
    return {
      animate: { scale: isSelected ? 1 : 0.98 },
      whileTap: { scale: 0.96 },
      transition: { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] },
    };
  };

  return (
    <>
      <Paper
        style={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderTopColor: theme.palette.divider,
        }}
        sx={(theme) => ({
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: 'block', md: 'none' },
          zIndex: 1200,
          borderTop: '1px solid',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 -6px 20px rgba(0, 0, 0, 0.45)'
              : '0 -6px 16px rgba(0, 0, 0, 0.08)',
          pb: 'env(safe-area-inset-bottom)',
        })}
        elevation={0}
      >
        <BottomNavigation
          aria-label="Navigasi Utama"
          value={selectedIndex}
          onChange={(_, newValue) => {
            const item = mobileNavItems[newValue];
            if (!item) return;

            if (item.opensSheet) {
              setSheetOpen(true);
              return;
            }

            navigateToPath(item.path);
          }}
          style={{
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.secondary,
          }}
          sx={(theme) => ({
            height: 64,
            px: 0.5,
            borderTop: `1px solid ${theme.palette.divider}`,
          })}
        >
          {mobileNavItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
            <BottomNavigationAction
              key={item.key}
              ref={item.opensSheet ? lainnyaButtonRef : undefined}
              data-guide-target={item.opensSheet ? 'nav-lainnya' : `nav-${item.key}`}
              aria-label={t(item.key)}
              label={
                <motion.span
                  {...getMotionProps(isSelected)}
                  style={{ display: 'inline-flex', transformOrigin: 'center' }}
                >
                  {t(item.key)}
                </motion.span>
              }
              icon={
                <motion.span
                  {...getMotionProps(isSelected)}
                  style={{ display: 'inline-flex', transformOrigin: 'center' }}
                >
                  {item.icon}
                </motion.span>
              }
              sx={{
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
                '& .MuiBottomNavigationAction-label': {
                  transition: 'transform 160ms ease',
                  color: 'inherit',
                },
                fontSize: '0.7rem',
                minWidth: 0,
              }}
            />
          )})}
        </BottomNavigation>
      </Paper>

      <MobileFeatureSheet
        open={sheetOpen}
        title={t('featureMenuTitle')}
        closeLabel={t('closeFeatureMenu')}
        groups={mobileFeatureGroups}
        getLabel={t}
        pathname={pathname}
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
          role="status"
          aria-live="polite"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {t('featureUnavailable')}
        </Alert>
      </Snackbar>
      <FeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}
