'use client';

import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { formatDateInputValue, formatDateShort, normalizeDateInputValue } from '@/lib/formatters';
import { softBg, softText, tableHoverBg } from '@/lib/themeColors';
import type { StockTranslator } from './stockChips';

import type { StokViewProps } from './StokView';

export interface StokMutationsViewProps
  extends Pick<
    StokViewProps,
    | 'filteredMutations'
    | 'grades'
    | 'mutFilter'
    | 'mutFromDate'
    | 'mutFromDateInvalid'
    | 'mutToDate'
    | 'mutToDateInvalid'
    | 'onApplyDateFilter'
    | 'onResetDateFilter'
    | 'setMutFilter'
    | 'setMutFromDate'
    | 'setMutToDate'
  > {
  isMobile: boolean;
  t: StockTranslator;
}

/**
 * Tab mutasi stok: penyaring grade dan rentang tanggal, lalu daftar mutasi
 * sebagai kartu untuk layar sempit dan tabel untuk layar lebar.
 */
export function StokMutationsView({
  isMobile,
  t,
  filteredMutations,
  grades,
  mutFilter,
  mutFromDate,
  mutFromDateInvalid,
  mutToDate,
  mutToDateInvalid,
  onApplyDateFilter,
  onResetDateFilter,
  setMutFilter,
  setMutFromDate,
  setMutToDate,
}: StokMutationsViewProps) {
  const theme = useTheme();

  return (
          <CardContent sx={{ p: isMobile ? 2 : 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>{t('mutationTable.filterGrade')}</InputLabel>
                <Select value={mutFilter} label={t('mutationTable.filterGrade')} onChange={(e) => setMutFilter(e.target.value)}>
                  <MenuItem value="semua">{t('mutationTable.allGrades')}</MenuItem>
                  {grades.map((g) => (
                    <MenuItem key={g.id} value={g.nama}>{g.nama}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Dari Tanggal"
                size="small"
                value={formatDateInputValue(mutFromDate)}
                onChange={(e) => setMutFromDate(normalizeDateInputValue(e.target.value))}
                error={mutFromDateInvalid}
                helperText={mutFromDateInvalid ? 'Format tanggal harus dd-MM-yyyy' : ''}
                placeholder="05-06-2026"
                sx={{ minWidth: 170 }}
              />
              <TextField
                label="Sampai Tanggal"
                size="small"
                value={formatDateInputValue(mutToDate)}
                onChange={(e) => setMutToDate(normalizeDateInputValue(e.target.value))}
                error={mutToDateInvalid}
                helperText={mutToDateInvalid ? 'Format tanggal harus dd-MM-yyyy' : ''}
                placeholder="05-06-2026"
                sx={{ minWidth: 170 }}
              />
              <Button variant="contained" size="small" onClick={onApplyDateFilter} disabled={mutFromDateInvalid || mutToDateInvalid} sx={{ height: 40, borderRadius: 2, px: 2 }}>
                Terapkan
              </Button>
              {(mutFromDate || mutToDate) && (
                <Button variant="text" size="small" onClick={onResetDateFilter} sx={{ height: 40, borderRadius: 2, color: 'text.secondary' }}>
                  Reset
                </Button>
              )}
            </Box>

            {isMobile ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {filteredMutations.length === 0 ? (
                  <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 6 }}>
                    Belum ada data mutasi.
                  </Typography>
                ) : (
                  filteredMutations.map((m) => (
                    <Card key={m._id} variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateShort(m.tanggal)}
                          </Typography>
                          <Chip
                            label={m.tipe === 'masuk' ? t('mutationTable.in') : t('mutationTable.out')}
                            size="small"
                            sx={{
                              bgcolor: m.tipe === 'masuk' ? softBg(theme, 'success', 0.14) : softBg(theme, 'error', 0.14),
                              color: m.tipe === 'masuk' ? softText(theme, 'success') : softText(theme, 'error'),
                              fontWeight: 700,
                              borderRadius: 1.5,
                              fontSize: '0.72rem'
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontWeight: 800 }}>
                            {m.batchCode}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {m.berat} kg
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                          {m.tujuan && (
                            <Typography variant="caption" color="text.secondary">
                              <strong>Tujuan:</strong> {m.tujuan}
                            </Typography>
                          )}
                          {m.catatan && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              <strong>Catatan:</strong> {m.catatan}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 480 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {[t('mutationTable.date'), t('mutationTable.batch'), t('mutationTable.type'), t('mutationTable.weight'), t('mutationTable.target'), t('mutationTable.note')].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', bgcolor: 'background.paper' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMutations.map((m) => (
                      <TableRow key={m._id} sx={{ '&:hover': { bgcolor: tableHoverBg(theme) } }}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateShort(m.tanggal)}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>{m.batchCode}</TableCell>
                        <TableCell>
                          <Chip
                            label={m.tipe === 'masuk' ? t('mutationTable.in') : t('mutationTable.out')}
                            size="small"
                            sx={{ bgcolor: m.tipe === 'masuk' ? softBg(theme, 'success', 0.14) : softBg(theme, 'error', 0.14), color: m.tipe === 'masuk' ? softText(theme, 'success') : softText(theme, 'error'), fontWeight: 700, borderRadius: 1.5 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.berat} kg</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{m.tujuan || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 200 }}>
                          <Typography variant="caption" noWrap sx={{ display: 'block' }}>{m.catatan || '—'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
  );
}

export default StokMutationsView;
