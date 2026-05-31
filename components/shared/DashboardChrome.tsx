'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Box from '@mui/material/Box';
import Sidebar from '@/components/shared/Sidebar';
import MobileTopAppBar from '@/components/shared/MobileTopAppBar';
import GuideProvider from '@/components/shared/guide/GuideProvider';

const MobileBottomNav = dynamic(() => import('@/components/shared/MobileBottomNav'), {
  ssr: false,
});

const SettingsModal = dynamic(() => import('@/components/shared/SettingsModal'), {
  ssr: false,
});

export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  return (
    <GuideProvider>
      <Sidebar />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: 'auto' },
          pb: { xs: 'calc(84px + env(safe-area-inset-bottom))', md: 0 },
          minHeight: '100dvh',
          backgroundColor: 'background.default',
          overflowX: 'hidden',
          '&:focus': { outline: 'none' },
        }}
      >
        <MobileTopAppBar />
        {children}
      </Box>

      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>
    </GuideProvider>
  );
}
