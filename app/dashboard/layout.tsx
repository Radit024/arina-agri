'use client';

import Box from '@mui/material/Box';
import Sidebar from '@/components/shared/Sidebar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import SettingsModal from '@/components/shared/SettingsModal';
import { Suspense } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pb: { xs: '84px', md: 0 }, // space for mobile bottom nav + safe area
          minHeight: '100dvh',
          backgroundColor: 'background.default',
        }}
      >
        {children}
      </Box>
      <MobileBottomNav />
      {/* Suspense boundary is needed for useSearchParams in SettingsModal */}
      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>
    </Box>
  );
}
