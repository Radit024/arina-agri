'use client';

import { useEffect, useMemo, useState } from 'react';

import { useFinanceProjects } from '@/hooks/useFinanceProjects';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ApiFinanceProject } from '@/lib/api';

export function useFinanceProjectController() {
  const projectState = useFinanceProjects();
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage<string | null>(
    'arina-selected-finance-project',
    null,
  );
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  useEffect(() => {
    if (!selectedProjectId && projectState.activeProjects.length > 0) {
      setSelectedProjectId(projectState.activeProjects[0].id);
    }
  }, [projectState.activeProjects, selectedProjectId, setSelectedProjectId]);

  const selectedProject = useMemo(
    () => projectState.projects.find((project) => project.id === selectedProjectId) ?? null,
    [projectState.projects, selectedProjectId],
  );

  const createProject = async (payload: Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await projectState.createProject(payload);
    setSelectedProjectId(created.id);
    setProjectDialogOpen(false);
    return created;
  };

  return {
    ...projectState,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    projectDialogOpen,
    setProjectDialogOpen,
    createProject,
  };
}

export type UseFinanceProjectControllerResult = ReturnType<typeof useFinanceProjectController>;
