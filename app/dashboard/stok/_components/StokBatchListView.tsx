'use client';

import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

import { formatDateShort, formatRupiah } from '@/lib/formatters';
import { accentText, softBg, softText, tableHoverBg } from '@/lib/themeColors';
import { computeBatchPerformance } from '@/hooks/useStok';
import { GradeChip, StatusChip, type StockTranslator } from './stockChips';

import type { StokViewProps } from './StokView';

export interface StokBatchListViewProps
  extends Pick<
    StokViewProps,
    'activeBatches' | 'loading' | 'onCloseBatch' | 'openAddBatch' | 'setStockOutDialogOpen' | 'stockOutForm'
  > {
  isMobile: boolean;
  t: StockTranslator;
}

/**
 * Tab daftar batch panen: kartu ringkas untuk layar sempit, tabel lengkap untuk
 * layar lebar.
 *
 * Induk `StokView` yang memutuskan tab mana yang aktif; panel ini hanya
 * merender isi tabnya.
 */
export function StokBatchListView({
  isMobile,
  t,
  activeBatches,
  loading,
  onCloseBatch,
  openAddBatch,
  setStockOutDialogOpen,
  stockOutForm,
}: StokBatchListViewProps) {
  const theme = useTheme();

  return (
          <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {isMobile ? (
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                  <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>
                    {t('table.loading')}
                  </Typography>
                ) : activeBatches.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">{t('table.empty')}</Typography>
                    <Button size="small" onClick={openAddBatch} sx={{ mt: 1 }}>+ {t('table.addFirst')}</Button>
                  </Box>
                ) : (
                  activeBatches.map((b) => (
                    <Card key={b._id} variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            {b.batchCode}
                          </Typography>
                          <StatusChip status={b.status} t={t} />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1.25, mb: 1.5, alignItems: 'center' }}>
                          <GradeChip grade={b.grade} t={t} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {b.stokTersisa} kg / {b.beratMasuk} kg
                          </Typography>
                        </Box>

                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.price')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatRupiah(b.hargaJual)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.expiry')}
                            </Typography>
                            <Typography variant="body2">
                              {formatDateShort(b.estimasiKadaluarsa)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.harvestDate')}
                            </Typography>
                            <Typography variant="body2">
                              {formatDateShort(b.tanggalPanen)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                              {t('table.location')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {b.lokasiPenyimpanan}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* BEP Performance Panel */}
                        {(() => {
                          const perf = computeBatchPerformance({ hargaModal: b.hargaModal, beratMasuk: b.beratMasuk, stokTersisa: b.stokTersisa, hargaJual: b.hargaJual });
                          if (perf.bepKg === null) return (
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
                              {t('batchPerformance.hargaJualBelumDiisi')}
                            </Typography>
                          );
                          return (
                            <Box sx={{ mb: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {t('batchPerformance.bepProgress')}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: perf.sudahBalikModal ? 'success.main' : 'text.secondary' }}>
                                  {perf.sudahBalikModal
                                    ? t('batchPerformance.sudahBalikModal')
                                    : t('batchPerformance.sisaBep', { kg: perf.sisaBepKg.toFixed(1) })}
                                </Typography>
                              </Box>
                              <Tooltip title={`${t('batchPerformance.sudahTerjual')}: ${perf.sudahTerjual} kg / ${t('batchPerformance.bepKg')}: ${perf.bepKg.toFixed(1)} kg`}>
                                <LinearProgress
                                  variant="determinate"
                                  value={perf.bepProgress * 100}
                                  color={perf.sudahBalikModal ? 'success' : 'primary'}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Tooltip>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {t('batchPerformance.estimasiLaba')}: <strong>{formatRupiah(perf.estimasiLabaJikaHabis)}</strong>
                              </Typography>
                            </Box>
                          );
                        })()}

                        <Divider sx={{ mb: 1.5 }} />

                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<LocalShippingIcon />}
                            onClick={() => { stockOutForm.setValue('batchId', b._id); setStockOutDialogOpen(true); }}
                            sx={{ borderRadius: 2, height: 40, textTransform: 'none', fontWeight: 600 }}
                          >
                            {t('buttons.stockOut')}
                          </Button>
                          <Button
                            color="warning"
                            variant="outlined"
                            size="small"
                            onClick={() => onCloseBatch(b._id)}
                            sx={{ borderRadius: 2, minWidth: 44, width: 44, height: 40 }}
                            aria-label="Tutup batch"
                          >
                            <InventoryIcon fontSize="small" />
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {[t('table.batchId'), t('table.harvestDate'), t('table.grade'), t('table.initialWeight'), t('table.remainingWeight'), t('table.price'), t('batchPerformance.bepProgress'), t('table.location'), t('table.expiry'), t('table.status'), t('table.action')].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={11} align="center" sx={{ py: 6 }}>{t('table.loading')}</TableCell></TableRow>
                    ) : activeBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 8 }}>
                          <Typography variant="body2" color="text.secondary">{t('table.empty')}</Typography>
                          <Button size="small" onClick={openAddBatch} sx={{ mt: 1 }}>+ {t('table.addFirst')}</Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeBatches.map((b) => (
                        <TableRow key={b._id} sx={{ '&:hover': { bgcolor: tableHoverBg(theme) } }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{b.batchCode}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(b.tanggalPanen)}</TableCell>
                          <TableCell><GradeChip grade={b.grade} t={t} /></TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{b.beratMasuk} kg</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: b.stokTersisa < b.beratMasuk * 0.2 ? softText(theme, 'error') : softText(theme, 'success') }}>
                            {b.stokTersisa} kg
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatRupiah(b.hargaJual)}</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            {(() => {
                              const perf = computeBatchPerformance({ hargaModal: b.hargaModal, beratMasuk: b.beratMasuk, stokTersisa: b.stokTersisa, hargaJual: b.hargaJual });
                              if (perf.bepKg === null) return <Typography variant="caption" color="text.disabled">—</Typography>;
                              return (
                                <Tooltip title={`${t('batchPerformance.sudahTerjual')}: ${perf.sudahTerjual} kg / BEP: ${perf.bepKg.toFixed(1)} kg`}>
                                  <Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={perf.bepProgress * 100}
                                      color={perf.sudahBalikModal ? 'success' : 'primary'}
                                      sx={{ height: 5, borderRadius: 3, mb: 0.5 }}
                                    />
                                    <Typography variant="caption" color={perf.sudahBalikModal ? 'success.main' : 'text.secondary'}>
                                      {perf.sudahBalikModal ? '✓' : `${perf.sisaBepKg.toFixed(1)} kg`}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })()}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{b.lokasiPenyimpanan}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatDateShort(b.estimasiKadaluarsa)}</TableCell>
                          <TableCell><StatusChip status={b.status} t={t} /></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" aria-label="Ship batch" onClick={() => { stockOutForm.setValue('batchId', b._id); setStockOutDialogOpen(true); }}
                                sx={{ color: softText(theme, 'info'), bgcolor: softBg(theme, 'info', 0.14), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.info.main, color: accentText(theme, 'info') } }}>
                                <LocalShippingIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" aria-label="Tutup batch" onClick={() => onCloseBatch(b._id)}
                                sx={{ color: softText(theme, 'warning'), bgcolor: softBg(theme, 'warning', 0.14), borderRadius: 1.5, '&:hover': { bgcolor: theme.palette.warning.main, color: accentText(theme, 'warning') } }}>
                                <InventoryIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
  );
}

export default StokBatchListView;
