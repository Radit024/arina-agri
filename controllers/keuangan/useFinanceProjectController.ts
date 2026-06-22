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

  return {
    ...projectState,
    selectedProjectId: selection.selectedProjectId,
    setSelectedProjectId,
    selectedProject: selection.selectedProject,
    projectDialogOpen,
    setProjectDialogOpen,
    createProject,
  };
}

export type UseFinanceProjectControllerResult = ReturnType<typeof useFinanceProjectController>;
