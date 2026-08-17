'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

import AppDialog from '@/components/ui/AppDialog';

export interface MasterDataItem {
  id: string;
  nama: string;
}

export interface MasterDataDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: MasterDataItem[];
  onAdd: (nama: string) => Promise<unknown>;
  onRename: (id: string, nama: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  deleteError: string | null;
  onClearDeleteError: () => void;
}

const iconButtonSx = { width: 44, height: 44, flexShrink: 0 };

export default function MasterDataDialog({
  open,
  onClose,
  title,
  items,
  onAdd,
  onRename,
  onDelete,
  deleteError,
  onClearDeleteError,
}: MasterDataDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newNama, setNewNama] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (item: MasterDataItem) => {
    setEditingId(item.id);
    setEditValue(item.nama);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;

    setSaving(true);
    try {
      await onRename(editingId, editValue.trim());
      setEditingId(null);
      setEditValue('');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = async () => {
    if (!newNama.trim()) return;

    setSaving(true);
    try {
      await onAdd(newNama.trim());
      setNewNama('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    onClearDeleteError();
    setSaving(true);
    try {
      await onDelete(id);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEditingId(null);
    setEditValue('');
    setNewNama('');
    onClearDeleteError();
    onClose();
  };

  return (
    <AppDialog
      fullWidth
      maxWidth="xs"
      mobilePresentation="dialog"
      open={open}
      title={title}
      onClose={() => handleClose()}
    >
      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearDeleteError}>
          {deleteError}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 2 }}>
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Belum ada item. Tambahkan di bawah.
          </Typography>
        )}
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.5,
              px: 0.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {editingId === item.id ? (
              <>
                <TextField
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  size="small"
                  autoFocus
                  disabled={saving}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSaveEdit();
                    if (event.key === 'Escape') {
                      event.stopPropagation();
                      handleCancelEdit();
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  aria-label={`Simpan ${item.nama}`}
                  color="primary"
                  disabled={saving || !editValue.trim()}
                  onClick={handleSaveEdit}
                  sx={iconButtonSx}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Batalkan edit ${item.nama}`}
                  disabled={saving}
                  onClick={handleCancelEdit}
                  sx={iconButtonSx}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{item.nama}</Typography>
                <IconButton
                  aria-label={`Edit ${item.nama}`}
                  disabled={saving}
                  onClick={() => handleStartEdit(item)}
                  sx={iconButtonSx}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Hapus ${item.nama}`}
                  color="error"
                  disabled={saving}
                  onClick={() => handleDelete(item.id)}
                  sx={iconButtonSx}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          value={newNama}
          onChange={(event) => setNewNama(event.target.value)}
          placeholder="Nama baru..."
          size="small"
          fullWidth
          onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          disabled={saving}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleAdd}
          disabled={saving || !newNama.trim()}
          startIcon={<AddIcon />}
          sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}
        >
          Tambah
        </Button>
      </Box>
    </AppDialog>
  );
}
