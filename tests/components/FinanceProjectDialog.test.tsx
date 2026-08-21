import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import FinanceProjectDialog from '@/app/dashboard/keuangan/_components/FinanceProjectDialog';
import type { UseKeuanganControllerResult } from '@/controllers/keuangan/useKeuanganController';
import type { ApiFinanceProject } from '@/lib/api';

type ProjectPayload = Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>;

function makeCreatedProject(payload: ProjectPayload): ApiFinanceProject {
  return {
    ...payload,
    id: 'project-test',
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  };
}

function makeFinanceProject(overrides: Partial<UseKeuanganControllerResult['financeProject']> = {}) {
  return {
    projectDialogOpen: true,
    setProjectDialogOpen: vi.fn(),
    createProject: vi.fn(async (payload: ProjectPayload) => makeCreatedProject(payload)),
    projects: [],
    activeProjects: [],
    selectedProject: null,
    selectedProjectId: null,
    setSelectedProjectId: vi.fn(),
    loading: false,
    error: null,
    backendOnline: true,
    reload: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    ...overrides,
  } as unknown as UseKeuanganControllerResult['financeProject'];
}

function renderDialog(financeProject = makeFinanceProject()) {
  return {
    financeProject,
    ...render(
      <ThemeProvider theme={createTheme()}>
        <FinanceProjectDialog financeProject={financeProject} />
      </ThemeProvider>,
    ),
  };
}

describe('FinanceProjectDialog', () => {
  it('shows clearer field examples and more complete project context inputs', () => {
    renderDialog();

    expect(screen.getByRole('textbox', { name: /Nama Proyek/i })).toHaveAttribute(
      'placeholder',
      'Cabai Rawit Blok A Musim Hujan 2026',
    );
    expect(screen.getByText('Pakai nama singkat yang mudah dicari di Buku Besar dan RAB.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Lokasi \/ Blok Lahan/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Varietas \/ Tipe/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Metode Budidaya/i })).toBeInTheDocument();
  });

  it('saves optional context into the existing project fields', async () => {
    const createProject = vi.fn(async (payload: ProjectPayload) => makeCreatedProject(payload));
    renderDialog(makeFinanceProject({ createProject }));

    fireEvent.change(screen.getByRole('textbox', { name: /Nama Proyek/i }), {
      target: { value: 'Cabai Rawit' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Lokasi \/ Blok Lahan/i }), {
      target: { value: 'Blok A' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Komoditas Utama/i }), {
      target: { value: 'Cabai Rawit' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Varietas \/ Tipe/i }), {
      target: { value: 'Dewata F1' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Label Musim Tanam/i }), {
      target: { value: 'MT 1 2026' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Metode Budidaya/i }), {
      target: { value: 'Greenhouse' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Buat Proyek' }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Cabai Rawit - Blok A',
        commodity: 'Cabai Rawit (Dewata F1)',
        seasonLabel: 'MT 1 2026 - Greenhouse',
      }));
    }, { timeout: 8000 });
  }, 15000);
});
