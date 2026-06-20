'use client';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import { formatMonthYear, formatRupiah } from '@/lib/formatters';
import MasterDataDialog from '@/app/dashboard/stok/_components/MasterDataDialog';
import RabItemForm from './RabItemForm';

type Props = Pick<UseKeuanganControllerResult, 'financeProject' | 'rab'>;

export default function RabPlanningView({ financeProject, rab }: Props) {
  if (!financeProject.selectedProject) {
    return (
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Belum ada proyek</Typography>
          <Typography variant="body2" color="text.secondary">
            Buat proyek atau import Excel untuk mulai menyusun rencana anggaran biaya.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Pendapatan Rencana</Typography>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 800 }}>
              {formatRupiah(rab.totals.plannedIncome)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Biaya Rencana</Typography>
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 800 }}>
              {formatRupiah(rab.totals.plannedExpense)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Laba Rencana</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: rab.totals.plannedProfit >= 0 ? 'success.main' : 'error.main' }}>
              {formatRupiah(Math.abs(rab.totals.plannedProfit))}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <CardContent sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>RAB Proyek</Typography>
              <Typography variant="body2" color="text.secondary">
                Kelola item rencana biaya dan pendapatan per proyek tanam.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleIcon />}
              onClick={rab.openRabItemDialog}
              sx={{
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 800,
                boxShadow: 'none',
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' },
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark', boxShadow: 'none' },
              }}
            >
              Tambah Item RAB
            </Button>
          </Box>

          <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Jenis</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell>Satuan</TableCell>
                  <TableCell align="right">Harga Satuan</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Bulan Kas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rab.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      Belum ada item RAB.
                    </TableCell>
                  </TableRow>
                ) : (
                  rab.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.categoryName ?? item.categoryId}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</TableCell>
                      <TableCell align="right">{item.volume}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell align="right">{formatRupiah(item.unitPrice)}</TableCell>
                      <TableCell align="right">{formatRupiah(item.plannedTotal)}</TableCell>
                      <TableCell>{item.plannedCashMonth ? formatMonthYear(item.plannedCashMonth) : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={rab.rabItemDialogOpen}
        onClose={rab.closeRabItemDialog}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography component="span" variant="h6" sx={{ display: 'block', fontFamily: 'var(--font-sora)', fontWeight: 800, lineHeight: 1.2 }}>
            Tambah Item RAB
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Lengkapi rencana supaya transaksi Buku Besar lebih mudah dicocokkan.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {rab.rabItemError && (
            <Alert severity="error" onClose={() => rab.setRabItemError(null)} sx={{ mb: 2, borderRadius: 2 }}>
              {rab.rabItemError}
            </Alert>
          )}
          <RabItemForm
            draft={rab.rabItemDraft}
            categoryOptions={rab.rabCategoryOptions}
            plannedTotal={rab.rabItemPlannedTotal}
            submitting={rab.rabItemSubmitting}
            onFieldChange={rab.updateRabItemDraftField}
            onOpenCategoryDialog={() => rab.setRabCategoryDialogOpen(true)}
            onCancel={rab.closeRabItemDialog}
            onSubmit={rab.submitRabItemDraft}
          />
        </DialogContent>
      </Dialog>

      <MasterDataDialog
        open={rab.rabCategoryDialogOpen}
        onClose={() => rab.setRabCategoryDialogOpen(false)}
        title={`Kelola Kategori RAB ${rab.rabItemDraft.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}`}
        items={rab.rabCategoryDialogItems}
        onAdd={rab.addRabCategory}
        onRename={rab.renameRabCategory}
        onDelete={rab.deleteRabCategory}
        deleteError={rab.rabCategoryDeleteError}
        onClearDeleteError={() => rab.setRabCategoryDeleteError(null)}
      />
    </>
  );
}
