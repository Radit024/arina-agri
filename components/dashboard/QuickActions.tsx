'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import { useTranslations } from 'next-intl';

export default function QuickActions() {
  const t = useTranslations('Dashboard.home.quickActions');

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: 'success.light',
            color: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <InventoryOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('description')}
          </Typography>
        </Box>
        <Button component={Link} href="/dashboard/stok" variant="contained">
          {t('action')}
        </Button>
      </CardContent>
    </Card>
  );
}
