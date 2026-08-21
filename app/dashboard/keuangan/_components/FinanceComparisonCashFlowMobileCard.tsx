import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { formatMonthYear, formatRupiah } from '@/lib/formatters';

export interface FinanceComparisonCashFlowRow {
  bulan: string;
  proyeksi: number;
  realisasi: number;
  selisih: number;
  selisihPercent: number | null;
}

export interface FinanceComparisonCashFlowMobileCardProps {
  row: FinanceComparisonCashFlowRow;
}

function formatSignedRupiah(value: number): string {
  if (value === 0) return formatRupiah(0);
  return `${value > 0 ? '+' : '−'}${formatRupiah(Math.abs(value))}`;
}

function formatPercentage(percent: number): string {
  const formatted = `${(percent * 100).toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

  return percent > 0 ? `+${formatted}` : formatted;
}

function colorForValue(value: number) {
  if (value > 0) return 'success.main';
  if (value < 0) return 'error.main';
  return 'text.primary';
}

export default function FinanceComparisonCashFlowMobileCard({
  row,
}: FinanceComparisonCashFlowMobileCardProps) {
  const monthLabel = formatMonthYear(row.bulan);
  const percentage = row.selisihPercent === null ? null : formatPercentage(row.selisihPercent);
  const metrics = [
    { label: 'Proyeksi', value: formatSignedRupiah(row.proyeksi), color: colorForValue(row.proyeksi) },
    { label: 'Realisasi', value: formatSignedRupiah(row.realisasi), color: colorForValue(row.realisasi) },
    { label: 'Selisih', value: formatSignedRupiah(row.selisih), color: colorForValue(row.selisih) },
  ];

  return (
    <Card
      aria-label={`Perbandingan arus kas ${monthLabel}`}
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
              <Typography
                aria-label={`${metric.label}: ${metric.value}`}
                color={metric.color}
                component="dd"
                sx={{ fontWeight: 800, m: 0, overflowWrap: 'anywhere' }}
                variant="body2"
              >
                {metric.value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, mt: 1 }}>
          <Typography color="text.secondary" variant="caption">
            Selisih (%)
          </Typography>
          {row.selisihPercent === null ? (
            <Typography aria-label="Selisih persentase: tidak tersedia" sx={{ fontWeight: 700 }} variant="body2">
              —
            </Typography>
          ) : (
            <Chip
              aria-label={`Selisih persentase: ${percentage}`}
              color={row.selisihPercent === 0 ? 'default' : row.selisihPercent > 0 ? 'success' : 'error'}
              label={percentage}
              size="small"
              sx={{ borderRadius: 1, fontWeight: 700 }}
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
