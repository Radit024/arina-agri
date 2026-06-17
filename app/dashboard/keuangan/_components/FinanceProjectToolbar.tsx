'use client';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import FinanceProjectDialog from './FinanceProjectDialog';

type Props = Pick<UseKeuanganControllerResult, 'financeProject' | 'rab' | 'financeExport'>;

export default function FinanceProjectToolbar({ financeProject, rab, financeExport }: Props) {
  return (
    <>
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 260 } }}>
            <InputLabel>Proyek </InputLabel>
            <Select
              label="Proyek"
              value={financeProject.selectedProjectId ?? ''}
              onChange={(event) => financeProject.setSelectedProjectId(event.target.value || null)}
            >
              {financeProject.projects.length === 0 && <MenuItem value="">Belum ada proyek</MenuItem>}
              {financeProject.projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<AddCircleIcon />}
            onClick={() => financeProject.setProjectDialogOpen(true)}
            sx={{ borderRadius: 8 }}
          >
            Buat Proyek
          </Button>

          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={!financeProject.selectedProject}
            sx={{ borderRadius: 8 }}
          >
            Import Excel
            <input
              hidden
              type="file"
              accept=".xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void rab.importRabFile(file);
                event.currentTarget.value = '';
              }}
            />
          </Button>

          <Button
            data-guide-target="finance-export"
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!financeProject.selectedProject || financeExport.exportLoading}
            onClick={financeExport.handleExportFinanceWorkbook}
            sx={{ borderRadius: 8 }}
          >
            Export Excel
          </Button>
        </Stack>

        {!financeProject.backendOnline && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
            Data RAB memakai penyimpanan lokal sampai tabel Supabase tersedia.
          </Typography>
        )}
        {rab.importError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
            {rab.importError}
          </Typography>
        )}
        {financeExport.exportError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
            {financeExport.exportError}
          </Typography>
        )}
      </Box>

      <FinanceProjectDialog financeProject={financeProject} />
    </>
  );
}
