'use client';

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';

import type { UseRabTransactionLinkControllerResult } from '@/controllers/keuangan/useRabTransactionLinkController';
import type { RabItem } from '@/lib/finance/rabTypes';
import { formatRupiah } from '@/lib/formatters';

interface Props {
  link: UseRabTransactionLinkControllerResult;
}

function targetTypeLabel(type: UseRabTransactionLinkControllerResult['targetRabType']) {
  if (type === 'income') return 'pendapatan';
  if (type === 'expense') return 'pengeluaran';
  return 'campuran';
}

export default function RabTransactionLinkDialog({ link }: Props) {
  const [overwriteItem, setOverwriteItem] = useState<RabItem | null>(null);
  const targetCount = link.targetTransactions.length;
  const hasMixedTypes = targetCount > 0 && !link.targetRabType;
  const emptyMessage = hasMixedTypes
    ? 'Pilih transaksi dengan jenis yang sama sebelum menghubungkan RAB.'
    : 'Belum ada item RAB yang cocok dengan transaksi ini.';

  const handleOptionClick = (item: RabItem) => {
    const existingLinks = link.targetTransactions.filter(
      (tx) => tx.rabItemId && tx.rabItemId !== item.id,
    );
    if (existingLinks.length > 0) {
      setOverwriteItem(item);
      return;
    }
    void link.linkToRabItem(item);
  };

  const overwriteCount = overwriteItem
    ? link.targetTransactions.filter((tx) => tx.rabItemId && tx.rabItemId !== overwriteItem.id).length
    : 0;

  return (
    <>
    <Dialog
      open={link.dialogOpen}
      onClose={link.closeDialog}
      maxWidth="sm"
      fullWidth
      aria-labelledby="rab-transaction-link-title"
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle id="rab-transaction-link-title" sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
              Hubungkan RAB
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {targetCount} transaksi {targetTypeLabel(link.targetRabType)} akan disambungkan ke item RAB.
            </Typography>
          </Box>
          <IconButton size="small" aria-label="Tutup hubungkan RAB" onClick={link.closeDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '12px !important' }}>
        {link.linkError && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {link.linkError}
          </Alert>
        )}

        <TextField
          size="small"
          label="Cari item RAB"
          placeholder="Nama item, kategori, bulan, atau alias"
          value={link.searchQuery}
          onChange={(event) => link.setSearchQuery(event.target.value)}
          disabled={hasMixedTypes}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
          {link.filteredRabOptions.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                px: 2,
                py: 3,
                textAlign: 'center',
                bgcolor: 'background.default',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {emptyMessage}
              </Typography>
            </Box>
          ) : (
            link.filteredRabOptions.map(({ item, isSuggested }) => (
              <ButtonBase
                key={item.id}
                aria-label={`Hubungkan RAB ${item.name}`}
                disabled={link.submitting}
                onClick={() => handleOptionClick(item)}
                sx={(theme) => ({
                  width: '100%',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  border: '1px solid',
                  borderColor: isSuggested ? 'primary.light' : 'divider',
                  borderRadius: 2,
                  p: 1.25,
                  bgcolor: isSuggested
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.07)
                    : 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.09),
                  },
                  '&.Mui-disabled': {
                    opacity: 0.65,
                  },
                })}
              >
                <Box sx={{ display: 'flex', width: '100%', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <LinkIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, mb: 0.25 }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, minWidth: 0 }}>
                        {item.name}
                      </Typography>
                      {isSuggested && (
                        <Chip label="Disarankan" size="small" color="primary" sx={{ height: 20, fontSize: '0.68rem' }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {item.categoryName ?? 'Kategori RAB'} - {item.volume} {item.unit} - {formatRupiah(item.plannedTotal)}
                    </Typography>
                  </Box>
                </Box>
              </ButtonBase>
            ))
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={link.closeDialog} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>
          Batal
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={Boolean(overwriteItem)}
      onClose={() => setOverwriteItem(null)}
      maxWidth="xs"
      fullWidth
      aria-labelledby="overwrite-link-title"
    >
      <DialogTitle id="overwrite-link-title">Ganti link RAB?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {overwriteCount} transaksi sudah terhubung ke item RAB lain. Ganti dengan &quot;{overwriteItem?.name}&quot;?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOverwriteItem(null)} sx={{ textTransform: 'none' }}>Batal</Button>
        <Button
          variant="contained"
          onClick={() => {
            const item = overwriteItem;
            setOverwriteItem(null);
            if (item) void link.linkToRabItem(item);
          }}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Ganti Link
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
