'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Link from 'next/link';
import type { ApiTransaction } from '@/lib/api';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

export default memo(function RecentTransactionsTable({ transactions }: { transactions: ApiTransaction[] }) {
  const t = useTranslations('Dashboard.recentTransactions');
  const recent = transactions.slice(0, 5);

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
            {t('title')}
          </Typography>
        }
        subheader={t('subheader', { count: recent.length })}
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', borderBottom: '1px solid', borderColor: 'divider', py: 2 } }}>
                <TableCell>{t('columns.date')}</TableCell>
                <TableCell>{t('columns.category')}</TableCell>
                <TableCell>{t('columns.note')}</TableCell>
                <TableCell>{t('columns.type')}</TableCell>
                <TableCell align="right">{t('columns.amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'action.hover', color: 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ReceiptLongOutlinedIcon fontSize="medium" />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{t('empty')}</Typography>
                      <Button component={Link} href="/dashboard/keuangan" variant="outlined" size="small" sx={{ mt: 1, borderRadius: 8, textTransform: 'none', fontWeight: 600 }}>
                        Tambah Transaksi
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((tx) => (
                  <TableRow
                    key={tx._id}
                    sx={{
                      '&:hover': { backgroundColor: 'action.hover' },
                      '& td': { borderColor: 'divider', fontSize: '0.875rem' },
                    }}
                  >
                    <TableCell sx={{ color: 'text.secondary' }}>{formatDateShort(tx.tanggal)}</TableCell>
                    <TableCell>{tx.kategori}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', maxWidth: { xs: 120, sm: 200, md: 250 } }} >
                      <Typography variant="body2" noWrap sx={{ display: 'block', fontWeight: 500 }}>{tx.keterangan}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tx.jenis === 'pendapatan' ? t('type.income') : t('type.expense')}
                        size="small"
                        sx={{
                          backgroundColor: tx.jenis === 'pendapatan' ? 'success.light' : 'error.light',
                          color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
                      }}
                    >
                      {tx.jenis === 'pendapatan' ? '+' : '-'}{formatRupiah(tx.nominal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
});
