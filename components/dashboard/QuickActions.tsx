'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

export default memo(function QuickActions() {
  const t = useTranslations('Dashboard.home.quickActions');

  return (
    <Card sx={{ borderRadius: 4, bgcolor: 'primary.light', border: 'none', boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: '24px !important' }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: '#FFFFFF',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <InventoryOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'primary.dark' }}>
            {t('title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'primary.main', mt: 0.5, fontWeight: 500 }}>
            {t('description')}
          </Typography>
        </Box>
        <Button component={Link} href="/dashboard/stok" variant="contained" sx={{ borderRadius: 8, px: 4, py: 1.5, boxShadow: 'none' }}>
          {t('action')}
        </Button>
      </CardContent>
    </Card>
  );
});
