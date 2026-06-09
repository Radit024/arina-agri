'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';

export interface MasterDataItem {
  id: string;
  nama: string;
}

interface MasterDataDialogProps {
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
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {deleteError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={onClearDeleteError}>
            {deleteError}
          </Alert>
        )}

        {/* List */}
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
                    onChange={(e) => setEditValue(e.target.value)}
                    size="small"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={handleSaveEdit} disabled={saving || !editValue.trim()} color="primary">
                    <CheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={handleCancelEdit}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{item.nama}</Typography>
                  <IconButton size="small" onClick={() => handleStartEdit(item)} disabled={saving}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(item.id)} color="error" disabled={saving}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Add new */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            value={newNama}
            onChange={(e) => setNewNama(e.target.value)}
            placeholder="Nama baru..."
            size="small"
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
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
      </DialogContent>
    </Dialog>
  );
}
