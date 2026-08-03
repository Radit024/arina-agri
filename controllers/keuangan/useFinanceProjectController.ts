'use client';

import { useEffect, useMemo, useState } from 'react';

import { useFinanceProjects } from '@/hooks/useFinanceProjects';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ApiFinanceProject } from '@/lib/api';

type FinanceProjectSelectionInput = {
  activeProjects: ApiFinanceProject[];
  loading: boolean;
  projects: ApiFinanceProject[];
  selectedProjectId: string | null;
};

export function resolveFinanceProjectSelection({
  activeProjects,
  loading,
  projects,
  selectedProjectId,
}: FinanceProjectSelectionInput) {
  const selectedProject = selectedProjectId
    ? projects.find((project) => project.id === selectedProjectId) ?? null
    : null;

  if (loading) {
    return {
      nextSelectedProjectId: selectedProjectId,
      selectedProject,
      selectedProjectId: selectedProject?.id ?? null,
    };
  }

  const fallbackProjectId = activeProjects[0]?.id ?? null;
  const nextSelectedProjectId = selectedProject ? selectedProject.id : fallbackProjectId;

  return {
    nextSelectedProjectId,
    selectedProject,
    selectedProjectId: selectedProject?.id ?? null,
  };
}

export function useFinanceProjectController() {
  const projectState = useFinanceProjects();
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage<string | null>(
    'arina-selected-finance-project',
    null,
  );
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<'create' | 'edit'>('create');
  const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const selection = useMemo(
    () => resolveFinanceProjectSelection({
      activeProjects: projectState.activeProjects,
      loading: projectState.loading,
      projects: projectState.projects,
      selectedProjectId,
    }),
    [projectState.activeProjects, projectState.loading, projectState.projects, selectedProjectId],
  );

  useEffect(() => {
    if (projectState.loading) return;
    if (selection.nextSelectedProjectId !== selectedProjectId) {
      setSelectedProjectId(selection.nextSelectedProjectId);
    }
  }, [projectState.loading, selectedProjectId, selection.nextSelectedProjectId, setSelectedProjectId]);

  const createProject = async (payload: Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await projectState.createProject(payload);
    setSelectedProjectId(created.id);
    setProjectDialogOpen(false);
    return created;
  };

  const updateProject = async (id: string, payload: Partial<ApiFinanceProject>) => {
    const updated = await projectState.updateProject(id, payload);
    setProjectDialogOpen(false);
    return updated;
  };

  const openCreateProjectDialog = () => {
    setProjectDialogMode('create');
    setProjectDialogOpen(true);
  };

  const openEditProjectDialog = () => {
    if (!selection.selectedProject) return;
    setProjectDialogMode('edit');
    setProjectDialogOpen(true);
  };

  const requestDeleteProject = () => {
    if (!selection.selectedProject) return;
    setDeleteProjectConfirmOpen(true);
  };

  const cancelDeleteProject = () => {
    setDeleteProjectConfirmOpen(false);
  };

  const confirmDeleteProject = async () => {
    if (!selection.selectedProject) return;
    setDeletingProject(true);
    try {
      await projectState.deleteProject(selection.selectedProject.id);
      setSelectedProjectId(null);
      setDeleteProjectConfirmOpen(false);
    } finally {
      setDeletingProject(false);
    }
  };

  return {
    ...projectState,
    selectedProjectId: selection.selectedProjectId,
    setSelectedProjectId,
    selectedProject: selection.selectedProject,
    projectDialogOpen,
    setProjectDialogOpen,
    projectDialogMode,
    createProject,
    updateProject,
    openCreateProjectDialog,
    openEditProjectDialog,
    deleteProjectConfirmOpen,
    deletingProject,
    requestDeleteProject,
    cancelDeleteProject,
    confirmDeleteProject,
  };
}

export type UseFinanceProjectControllerResult = ReturnType<typeof useFinanceProjectController>;
