'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';

export default function QuickActions() {
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
            Manajemen Stok Panen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pantau stok dan batch panen terbaru.
          </Typography>
        </Box>
        <Button component={Link} href="/dashboard/stok" variant="contained">
          Buka Stok
        </Button>
      </CardContent>
    </Card>
  );
}
