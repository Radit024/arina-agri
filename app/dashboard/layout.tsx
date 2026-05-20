'use client';

import Box from '@mui/material/Box';
import Sidebar from '@/components/shared/Sidebar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import SettingsModal from '@/components/shared/SettingsModal';
import MobileTopAppBar from '@/components/shared/MobileTopAppBar';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2, ease: 'easeOut' },
      };

  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, minHeight: '100dvh' }}>
      {/* Fix #5: Skip-to-main-content link for keyboard/screen reader accessibility */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed',
          top: -56,
          left: 8,
          zIndex: 9999,
          bgcolor: 'primary.main',
          color: 'white',
          px: 2.5,
          py: 1,
          borderRadius: 2,
          fontWeight: 700,
          fontSize: '0.875rem',
          textDecoration: 'none',
          '&:focus': {
            top: 8,
          },
          transition: 'top 0.2s ease-in-out',
        }}
      >
        Lewati ke konten utama
      </Box>

      <Sidebar />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: 'auto' },
          pb: { xs: 'calc(84px + env(safe-area-inset-bottom))', md: 0 }, // space for mobile bottom nav + safe area
          minHeight: '100dvh',
          backgroundColor: 'background.default',
          overflowX: 'hidden',
          '&:focus': { outline: 'none' },
        }}
      >
        <MobileTopAppBar />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pathname} {...motionProps}>
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Suspense boundary is needed for useSearchParams hooks in mobile nav and settings modal */}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>
    </Box>
  );
}
