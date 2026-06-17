'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import { formatRupiah, formatDateShort } from '@/lib/formatters';
import type { TransactionDraft } from '@/controllers/keuangan/useTransactionBatchController';

interface Props {
  drafts: TransactionDraft[];
  submitting: boolean;
  editingTransactionId: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export default function TransactionConfirmView({
  drafts,
  submitting,
  editingTransactionId,
  onBack,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const newCount = editingTransactionId ? drafts.length - 1 : drafts.length;
  const editCount = editingTransactionId ? 1 : 0;

  const buttonLabel = editingTransactionId
    ? `Simpan (${editCount} diperbarui${newCount > 0 ? ` + ${newCount} baru` : ''})`
    : `Simpan Semua (${drafts.length} transaksi)`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Periksa kembali sebelum menyimpan. Semua data di bawah akan disimpan sekaligus.
      </Typography>

      <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Tanggal', 'Kategori', 'Jenis', 'Nominal'].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {drafts.map((draft, i) => {
              const nominalNum = Number(draft.nominal.replace(/\./g, '')) || 0;
              const isPendapatan = draft.jenis === 'pendapatan';
              const isEdited = i === 0 && !!editingTransactionId;
              return (
                <TableRow key={draft.id}>
                  <TableCell sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    {formatDateShort(draft.tanggal)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {draft.kategori}
                    {isEdited && (
                      <Chip
                        label="Edit"
                        size="small"
                        sx={{ ml: 1, height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isPendapatan ? 'Pendapatan' : 'Pengeluaran'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: isPendapatan
                          ? alpha(theme.palette.success.main, 0.12)
                          : alpha(theme.palette.error.main, 0.12),
                        color: isPendapatan ? 'success.dark' : 'error.dark',
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      color: isPendapatan ? 'success.main' : 'error.main',
                    }}
                  >
                    {isPendapatan ? '+' : '−'}{formatRupiah(nominalNum)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          disabled={submitting}
          sx={{ flex: 1, borderRadius: 8 }}
        >
          Kembali
        </Button>
        <Button
          variant="contained"
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={onConfirm}
          disabled={submitting}
          sx={{ flex: 2, borderRadius: 8, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
        >
          {submitting ? 'Menyimpan...' : buttonLabel}
        </Button>
      </Box>
    </Box>
  );
}
