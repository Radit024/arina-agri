import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { formatMonthYear, formatRupiah } from '@/lib/formatters';
import type { ArusKasPascaPembiayaanBulanan } from '@/lib/finance/rabTypes';

export interface FinanceFinancingMobileCardProps {
  row: ArusKasPascaPembiayaanBulanan;
}

export default function FinanceFinancingMobileCard({ row }: FinanceFinancingMobileCardProps) {
  const monthLabel = formatMonthYear(row.bulan);
  const metrics = [
    { label: 'Kas Setelah Pembiayaan', value: formatRupiah(row.kasSetelahPembiayaan) },
    { label: 'Kas Kumulatif Setelah Pembiayaan', value: formatRupiah(row.kasKumulatifSetelahPembiayaan) },
  ];

  return (
    <Card
      aria-label={`Arus kas pasca pembiayaan ${monthLabel}`}
      component="article"
      variant="outlined"
      sx={{ mb: 1.5, minWidth: 0 }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 }, minWidth: 0, p: 2 }}>
        <Typography component="h3" sx={{ fontWeight: 800 }} variant="subtitle1">
          {monthLabel}
        </Typography>
        <Box
          component="dl"
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            m: 0,
            mt: 1.5,
          }}
        >
          {metrics.map((metric) => (
            <Box key={metric.label} sx={{ minWidth: 0 }}>
              <Typography color="text.secondary" component="dt" variant="caption">
                {metric.label}
              </Typography>
              <Typography component="dd" sx={{ fontWeight: 800, m: 0, overflowWrap: 'anywhere' }} variant="body2">
                {metric.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
