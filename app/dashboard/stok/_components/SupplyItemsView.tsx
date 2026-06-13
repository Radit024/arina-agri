'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

import { formatRupiah } from '@/lib/formatters';
import type { ApiSupplyItem, NewSupplyItem, NewSupplyMutation } from '@/lib/api';

interface SupplyItemsViewProps {
  items: ApiSupplyItem[];
  loading: boolean;
  onAddItem: (payload: NewSupplyItem) => Promise<boolean>;
  onAddMutation: (payload: NewSupplyMutation) => Promise<boolean>;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const SATUAN_OPTIONS = ['kg', 'liter', 'botol', 'sak', 'unit'];

function formatStock(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

export default function SupplyItemsView({ items, loading, onAddItem, onAddMutation, t }: SupplyItemsViewProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [mutationItemId, setMutationItemId] = useState<string | null>(null);

  // Add Item form state
  const [newNama, setNewNama] = useState('');
  const [newKategori, setNewKategori] = useState<'bahan_pendukung' | 'alat'>('bahan_pendukung');
  const [newSatuan, setNewSatuan] = useState('kg');
  const [newHarga, setNewHarga] = useState('');
  const [newCatatan, setNewCatatan] = useState('');
  const [itemSubmitting, setItemSubmitting] = useState(false);

  // Add Mutation form state
  const [mutTipe, setMutTipe] = useState<'masuk' | 'keluar' | 'distribusi'>('masuk');
  const [mutJumlah, setMutJumlah] = useState('');
  const [mutHarga, setMutHarga] = useState('');
  const [mutTanggal, setMutTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [mutKeterangan, setMutKeterangan] = useState('');
  const [mutSubmitting, setMutSubmitting] = useState(false);

  const handleAddItem = async () => {
    if (!newNama.trim()) return;
    setItemSubmitting(true);
    const ok = await onAddItem({
      nama: newNama.trim(),
      kategori: newKategori,
      satuan: newSatuan,
      hargaBeliTerakhir: newHarga ? Number(newHarga) : undefined,
      catatan: newCatatan.trim() || undefined,
    });
    if (ok) {
      setAddItemOpen(false);
      setNewNama(''); setNewKategori('bahan_pendukung'); setNewSatuan('kg');
      setNewHarga(''); setNewCatatan('');
    }
    setItemSubmitting(false);
  };

  const handleAddMutation = async () => {
    if (!mutationItemId || !mutJumlah || Number(mutJumlah) <= 0) return;
    setMutSubmitting(true);
    const ok = await onAddMutation({
      itemId: mutationItemId,
      tipe: mutTipe,
      jumlah: Number(mutJumlah),
      hargaSatuan: mutHarga ? Number(mutHarga) : undefined,
      tanggal: mutTanggal,
      keterangan: mutKeterangan.trim() || undefined,
    });
    if (ok) {
      setMutationItemId(null);
      setMutTipe('masuk'); setMutJumlah(''); setMutHarga('');
      setMutTanggal(new Date().toISOString().split('T')[0]); setMutKeterangan('');
    }
    setMutSubmitting(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  const mutationItem = items.find((i) => i.id === mutationItemId) ?? null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddItemOpen(true)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          {t('supply.addItem')}
        </Button>
      </Box>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {t('supply.emptyState')}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {t('supply.emptyStateDesc')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddItemOpen(true)}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t('supply.addItem')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {items.map((item) => (
            <Card key={item.id} variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.nama}</Typography>
                    <Chip
                      label={t(`supply.kategori.${item.kategori}`)}
                      size="small"
                      sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800, color: item.stokSaatIni <= 0 ? 'error.main' : 'text.primary' }}
                    >
                      {formatStock(item.stokSaatIni)} {item.satuan}
                    </Typography>
                    {item.hargaBeliTerakhir && (
                      <Typography variant="caption" color="text.secondary">
                        {formatRupiah(item.hargaBeliTerakhir)}/{item.satuan}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() => setMutationItemId(item.id)}
                  sx={{ borderRadius: 2, height: 36, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('supply.addMutation')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('supply.addItem')}
          <IconButton size="small" onClick={() => setAddItemOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            label={t('supply.fields.nama')}
            value={newNama}
            onChange={(e) => setNewNama(e.target.value)}
            size="small"
            fullWidth
            autoFocus
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t('supply.fields.kategori')}</InputLabel>
            <Select
              value={newKategori}
              label={t('supply.fields.kategori')}
              onChange={(e) => setNewKategori(e.target.value as 'bahan_pendukung' | 'alat')}
            >
              <MenuItem value="bahan_pendukung">{t('supply.kategori.bahan_pendukung')}</MenuItem>
              <MenuItem value="alat">{t('supply.kategori.alat')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>{t('supply.fields.satuan')}</InputLabel>
            <Select
              value={newSatuan}
              label={t('supply.fields.satuan')}
              onChange={(e) => setNewSatuan(e.target.value)}
            >
              {SATUAN_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label={t('supply.fields.hargaBeliTerakhir')}
            value={newHarga}
            onChange={(e) => setNewHarga(e.target.value)}
            size="small"
            fullWidth
            type="number"
            slotProps={{ input: { inputProps: { min: 0 } } }}
          />
          <TextField
            label={t('supply.fields.catatan')}
            value={newCatatan}
            onChange={(e) => setNewCatatan(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!newNama.trim() || itemSubmitting}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {itemSubmitting ? 'Menyimpan...' : t('supply.addItem')}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add Mutation Dialog */}
      <Dialog open={!!mutationItemId} onClose={() => setMutationItemId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {mutationItem ? `${t('supply.addMutation')} — ${mutationItem.nama}` : t('supply.addMutation')}
          <IconButton size="small" onClick={() => setMutationItemId(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <FormControl size="small" fullWidth>
            <InputLabel>{t('supply.fields.tipe')}</InputLabel>
            <Select
              value={mutTipe}
              label={t('supply.fields.tipe')}
              onChange={(e) => setMutTipe(e.target.value as 'masuk' | 'keluar' | 'distribusi')}
            >
              <MenuItem value="masuk">{t('supply.mutation.masuk')}</MenuItem>
              <MenuItem value="keluar">{t('supply.mutation.keluar')}</MenuItem>
              <MenuItem value="distribusi">{t('supply.mutation.distribusi')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={`${t('supply.fields.jumlah')} (${mutationItem?.satuan ?? ''})`}
            value={mutJumlah}
            onChange={(e) => setMutJumlah(e.target.value)}
            size="small"
            fullWidth
            type="number"
            slotProps={{ input: { inputProps: { min: 0, step: 'any' } } }}
          />
          <TextField
            label={t('supply.fields.hargaSatuan')}
            value={mutHarga}
            onChange={(e) => setMutHarga(e.target.value)}
            size="small"
            fullWidth
            type="number"
            slotProps={{ input: { inputProps: { min: 0 } } }}
          />
          <TextField
            label={t('supply.fields.tanggal')}
            value={mutTanggal}
            onChange={(e) => setMutTanggal(e.target.value)}
            size="small"
            fullWidth
            type="date"
          />
          <TextField
            label={t('supply.fields.catatan')}
            value={mutKeterangan}
            onChange={(e) => setMutKeterangan(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
          <Button
            variant="contained"
            onClick={handleAddMutation}
            disabled={!mutJumlah || Number(mutJumlah) <= 0 || mutSubmitting}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {mutSubmitting ? 'Menyimpan...' : t('supply.addMutation')}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
