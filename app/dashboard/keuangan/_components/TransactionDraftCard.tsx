'use client';

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { formatDateLong, formatRupiah } from '@/lib/formatters';
import type { TransactionDraft, DraftErrors } from '@/controllers/keuangan/useTransactionBatchController';
import TransactionEntryForm from './TransactionEntryForm';

interface Props {
  draft: TransactionDraft;
  index: number;
  isExpanded: boolean;
  hasError: boolean;
  errors: DraftErrors;
  onExpand: () => void;
  onRemove: () => void;
  canRemove: boolean;
  kategoriList: string[];
  satuanList: string[];
  onFieldChange: (field: keyof TransactionDraft, value: string) => void;
  onOpenKategoriDialog: () => void;
  onOpenSatuanDialog: () => void;
  rabSuggestion: string | null;
}

export default function TransactionDraftCard({
  draft,
  index,
  isExpanded,
  hasError,
  errors,
  onExpand,
  onRemove,
  canRemove,
  kategoriList,
  satuanList,
  onFieldChange,
  onOpenKategoriDialog,
  onOpenSatuanDialog,
  rabSuggestion,
}: Props) {
  const theme = useTheme();
  const nominalNum = Number(draft.nominal.replace(/\./g, '')) || 0;
  const isPendapatan = draft.jenis === 'pendapatan';

  return (
    <Box
      sx={{
        alignItems: 'stretch',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: hasError ? 'error.main' : isExpanded ? 'primary.main' : 'divider',
        borderRadius: '12px',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <Accordion
        expanded={isExpanded}
        onChange={onExpand}
        disableGutters
        elevation={0}
        sx={{ border: 'none', flex: 1, minWidth: 0, '&:before': { display: 'none' } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
            minHeight: 56,
            '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: hasError ? 'error.main' : isPendapatan ? 'success.main' : 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isPendapatan
              ? <TrendingUpIcon sx={{ color: 'white', fontSize: 14 }} />
              : <TrendingDownIcon sx={{ color: 'white', fontSize: 14 }} />}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
              {draft.kategori || `Transaksi ${index + 1}`}
            </Typography>
            {!isExpanded && nominalNum > 0 && (
              <Typography variant="caption" color="text.secondary">
                {formatRupiah(nominalNum)} - {formatDateLong(draft.tanggal)}
              </Typography>
            )}
          </Box>

          {!isExpanded && draft.kategori && (
            <Chip
              label={isPendapatan ? 'Pendapatan' : 'Pengeluaran'}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: isPendapatan ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.error.main, 0.12),
                color: isPendapatan ? 'success.dark' : 'error.dark',
              }}
            />
          )}
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 1.5, pb: 2, px: 2 }}>
          <TransactionEntryForm
            draft={draft}
            kategoriList={kategoriList}
            satuanList={satuanList}
            errors={errors}
            onFieldChange={onFieldChange}
            onOpenKategoriDialog={onOpenKategoriDialog}
            onOpenSatuanDialog={onOpenSatuanDialog}
            rabSuggestion={isExpanded ? rabSuggestion : null}
          />
        </AccordionDetails>
      </Accordion>

      {canRemove && (
        <IconButton
          size="small"
          onClick={onRemove}
          aria-label="Hapus transaksi ini"
          sx={{ alignSelf: 'center', color: 'error.main', flexShrink: 0, mr: 1.5 }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}
