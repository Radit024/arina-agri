import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { formatDateShort, formatMonthYear, formatRupiah } from '@/lib/formatters';
import type { ArusKasBulanan, FinanceTransactionForReport } from '@/lib/finance/rabTypes';

export interface FinanceCashFlowMobileCardProps {
  row: ArusKasBulanan;
  transactions: readonly FinanceTransactionForReport[];
}

function colorForNet(value: number) {
  if (value > 0) return 'success.main';
  if (value < 0) return 'error.main';
  return 'text.secondary';
}

function formatSignedRupiah(value: number) {
  if (value === 0) return formatRupiah(0);
  return `${value > 0 ? '+' : '−'}${formatRupiah(Math.abs(value))}`;
}

export default function FinanceCashFlowMobileCard({
  row,
  transactions,
}: FinanceCashFlowMobileCardProps) {
  const monthLabel = formatMonthYear(row.bulan);
  const net = row.kasMasuk - row.kasKeluar;
  const monthTransactions = transactions.filter((transaction) => transaction.tanggal.slice(0, 7) === row.bulan);
  const metricItems = [
    { label: 'Kas Masuk', value: formatSignedRupiah(row.kasMasuk), color: row.kasMasuk > 0 ? 'success.main' : 'text.secondary' },
    { label: 'Kas Keluar', value: formatSignedRupiah(-row.kasKeluar), color: row.kasKeluar > 0 ? 'error.main' : 'text.secondary' },
    { label: 'Kas Bersih', value: formatSignedRupiah(net), color: colorForNet(net) },
    { label: 'Kumulatif', value: formatSignedRupiah(row.kasKumulatif), color: colorForNet(row.kasKumulatif) },
  ];

  return (
    <Card
      aria-label={`Arus kas ${monthLabel}`}
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
          {metricItems.map((metric) => (
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

        <Divider sx={{ my: 1.5 }} />

        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
          <AccordionSummary
            aria-controls={`cash-flow-detail-${row.bulan}`}
            expandIcon={<ExpandMoreIcon />}
            id={`cash-flow-summary-${row.bulan}`}
            sx={{
              minHeight: 44,
              px: 1.5,
              '&.Mui-expanded': { minHeight: 44 },
              '& .MuiAccordionSummary-content': { my: 1 },
              '& .MuiAccordionSummary-content.Mui-expanded': { my: 1 },
            }}
          >
            <Typography sx={{ fontWeight: 700 }} variant="body2">
              {`Detail transaksi ${monthLabel}`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1.5, pt: 0 }}>
            {monthTransactions.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Tidak ada transaksi di bulan ini.
              </Typography>
            ) : (
              <Box aria-label={`Transaksi ${monthLabel}`} component="ul" sx={{ display: 'grid', gap: 1.25, listStyle: 'none', m: 0, p: 0 }}>
                {monthTransactions.map((transaction) => {
                  const isIncome = transaction.jenis === 'pendapatan';

                  return (
                    <Box component="li" key={transaction.id} sx={{ alignItems: 'flex-start', display: 'grid', gap: 0.5, gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography color="text.secondary" variant="caption">
                          {formatDateShort(transaction.tanggal)}
                        </Typography>
                        <Box sx={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
                          <Chip color={isIncome ? 'success' : 'error'} label={transaction.kategori} size="small" variant="outlined" />
                          <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
                            {transaction.keterangan || '-'}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography color={isIncome ? 'success.main' : 'error.main'} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }} variant="body2">
                        {formatSignedRupiah(isIncome ? transaction.nominal : -transaction.nominal)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
}
