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
    <Card 
      sx={{ 
        borderRadius: 4, 
        bgcolor: 'success.light', 
        border: '1px solid',
        borderColor: 'success.main',
        opacity: 0.9,
        boxShadow: 'none',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-2px)' }
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column', md: 'row' }, alignItems: 'center', gap: 2, p: '16px !important' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            bgcolor: 'common.white',
            color: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            flexShrink: 0,
          }}
        >
          <InventoryOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'var(--font-sora)', color: 'success.dark', lineHeight: 1.2 }}>
            {t('title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'success.dark', mt: 0.2, fontWeight: 500, display: 'block', opacity: 0.8 }}>
            {t('description')}
          </Typography>
        </Box>
        <Button 
          component={Link} 
          href="/dashboard/stok" 
          variant="contained" 
          size="small"
          sx={{ 
            borderRadius: 2, 
            px: 2, 
            bgcolor: 'success.main',
            '&:hover': { bgcolor: 'success.dark' },
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          {t('action')}
        </Button>
      </CardContent>
    </Card>
  );
});
