'use client';

import DownloadIcon from '@mui/icons-material/Download';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';

type Props = Pick<UseKeuanganControllerResult, 'financeProject' | 'financeExport'>;

export default function FinanceExportView({ financeProject, financeExport }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Export Laporan Excel</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          Workbook berisi RAB, Catatan Transaksi Harian, Laporan Laba Rugi, Arus Kas, dan Perbandingan Rencana vs Aktual.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!financeProject.selectedProject || financeExport.exportLoading}
            onClick={financeExport.handleExportFinanceWorkbook}
            sx={{ borderRadius: 8 }}
          >
            Download Excel
          </Button>
        </Stack>
        {financeExport.exportError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
            {financeExport.exportError}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
