'use client';

import Box from '@mui/material/Box';
import Sidebar from '@/components/shared/Sidebar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import SettingsModal from '@/components/shared/SettingsModal';
import { Suspense } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, minHeight: '100dvh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: 'auto' },
          pb: { xs: 'calc(84px + env(safe-area-inset-bottom))', md: 0 }, // space for mobile bottom nav + safe area
          minHeight: '100dvh',
          backgroundColor: 'background.default',
          overflowX: 'hidden',
        }}
      >
        {children}
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
