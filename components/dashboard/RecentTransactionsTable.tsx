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
import { mockTransactions } from '@/lib/mockData';
import { formatRupiah, formatDateShort } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

export default function RecentTransactionsTable() {
  const t = useTranslations('Dashboard.recentTransactions');
  const recent = mockTransactions.slice(0, 5);

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 600 }}>
            {t('title')}
          </Typography>
        }
        subheader={t('subheader')}
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', borderBottom: '2px solid', borderColor: 'divider' } }}>
                <TableCell>{t('columns.date')}</TableCell>
                <TableCell>{t('columns.category')}</TableCell>
                <TableCell>{t('columns.note')}</TableCell>
                <TableCell>{t('columns.type')}</TableCell>
                <TableCell align="right">{t('columns.amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map((tx) => (
                <TableRow
                  key={tx.id}
                  sx={{
                    '&:hover': { backgroundColor: '#f8fafc' },
                    '& td': { borderColor: '#f1f5f9', fontSize: '0.875rem' },
                  }}
                >
                  <TableCell sx={{ color: 'text.secondary' }}>{formatDateShort(tx.tanggal)}</TableCell>
                  <TableCell>{tx.kategori}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }} >
                    <Typography variant="caption" noWrap sx={{ display: 'block' }}>{tx.keterangan}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tx.jenis === 'pendapatan' ? t('type.income') : t('type.expense')}
                      size="small"
                      sx={{
                        backgroundColor: tx.jenis === 'pendapatan' ? '#dcfce7' : '#fee2e2',
                        color: tx.jenis === 'pendapatan' ? '#16a34a' : '#dc2626',
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
