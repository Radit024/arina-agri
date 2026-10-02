import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import dynamic from 'next/dynamic';

// Chart dimuat di sisi klien saja: MUI x-charts menyentuh canvas yang tidak
// ada saat SSR.
const PieChart = dynamic(() => import('@mui/x-charts/PieChart').then((m) => ({ default: m.PieChart })), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" width={300} height={200} sx={{ borderRadius: 2 }} />,
});

export const EXPENSE_DISTRIBUTION_SERIES_ID = 'expense-distribution';

export interface DistributionPanelHighlight {
  type?: 'pie';
  seriesId: string;
  dataIndex?: number;
}

export interface FinanceDistributionPanelProps {
  t: (key: string) => string;
  finalPieData: Array<{ id: string; label: string; value: number; color: string; percentage: number }>;
  finalPieColors: string[];
  hasDistributionData: boolean;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  highlightedItem: DistributionPanelHighlight | null;
  onHighlightedItemChange: (item: DistributionPanelHighlight | null) => void;
  renderBreakdown: (maxHeight?: number) => React.ReactNode;
}

function closeIconButtonSx(theme: { palette: { mode: string; text: { primary: string } } }) {
  const isDarkMode = theme.palette.mode === 'dark';

  return {
    color: 'text.secondary',
    bgcolor: alpha(theme.palette.text.primary, isDarkMode ? 0.08 : 0.06),
    '&:hover': {
      color: 'text.primary',
      bgcolor: alpha(theme.palette.text.primary, isDarkMode ? 0.14 : 0.1),
    },
  };
}

/**
 * Panel distribusi pengeluaran: ringkasan persentase, grafik donat, dan dialog
 * layar penuh untuk layar sempit.
 *
 * Dipisah dari `FinanceLedgerView` karena panel ini Ownership lebarnya sendiri
 * dan tidak pernah menyentuh tabel transaksi.
 */
export function FinanceDistributionPanel({
  t,
  finalPieData,
  finalPieColors,
  hasDistributionData,
  panelOpen,
  onPanelOpenChange,
  dialogOpen,
  onDialogOpenChange,
  highlightedItem,
  onHighlightedItemChange,
  renderBreakdown,
}: FinanceDistributionPanelProps) {
  return (
    <>
    <Collapse
      orientation="horizontal"
      in={panelOpen}
      sx={{
        display: { xs: 'none', md: 'block' },
        '& .MuiCollapse-wrapper': { height: '100%' },
        '& .MuiCollapse-wrapperInner': { height: '100%' },
      }}
    >
      <Card
        data-testid="finance-distribution-card"
        data-finance-card-align="ledger"
        data-finance-card-fill-bottom="true"
        sx={{
          width: { md: 300, lg: 330 },
          flexShrink: 0,
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 700 }}>
            {t('distribution.title')}
          </Typography>
        }
        action={
          <IconButton
            aria-label={t('common.cancel')}
            size="small"
            onClick={() => onPanelOpenChange(false)}
            sx={(theme) => closeIconButtonSx(theme)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0, px: 2, pb: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1.5 }}>
        <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <PieChart
            series={[
              {
                id: EXPENSE_DISTRIBUTION_SERIES_ID,
                data: finalPieData,
                innerRadius: 48,
                outerRadius: 84,
                paddingAngle: hasDistributionData ? 4 : 0,
                cornerRadius: 5,
                highlightScope: { fade: 'global', highlight: 'item' },
                faded: { innerRadius: 40, additionalRadius: -10, color: 'gray' },
              },
            ]}
            colors={finalPieColors}
            highlightedItem={highlightedItem}
            onHighlightChange={(item) => onHighlightedItemChange(item)}
            width={300}
            height={210}
            hideLegend
          />
        </Box>
        {renderBreakdown()}
      </CardContent>
    </Card>
    </Collapse>

    <Dialog
    open={dialogOpen}
    onClose={() => onDialogOpenChange(false)}
    maxWidth="sm"
    fullWidth
    slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
    <DialogTitle sx={{ pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: 'var(--font-sora)', fontWeight: 800 }}>
          {t('distribution.title')}
        </Typography>
        <IconButton aria-label={t('common.cancel')} size="small" onClick={() => onDialogOpenChange(false)} sx={(theme) => closeIconButtonSx(theme)}>
          <CloseIcon />
        </IconButton>
      </Box>
    </DialogTitle>
    <DialogContent sx={{ pt: '8px !important', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <PieChart
        series={[
          {
            id: EXPENSE_DISTRIBUTION_SERIES_ID,
            data: finalPieData,
            innerRadius: 52,
            outerRadius: 96,
            paddingAngle: hasDistributionData ? 4 : 0,
            cornerRadius: 5,
            highlightScope: { fade: 'global', highlight: 'item' },
            faded: { innerRadius: 44, additionalRadius: -10, color: 'gray' },
          },
        ]}
        colors={finalPieColors}
        highlightedItem={highlightedItem}
        onHighlightChange={(item) => onHighlightedItemChange(item)}
        width={320}
        height={220}
        margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
        hideLegend
      />
      <Box sx={{ width: '100%', maxWidth: 360 }}>
        {renderBreakdown(240)}
      </Box>
    </DialogContent>
    </Dialog>
    </>
  );
}

export default FinanceDistributionPanel;
