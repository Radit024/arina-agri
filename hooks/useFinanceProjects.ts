'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';
import { financeProjectApi, type ApiFinanceProject } from '@/lib/api';

type ProjectDraft = Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>;

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useFinanceProjects() {
  const { user, loading: authLoading } = useAuth();
  const storageKey = `arina-finance-projects-${user?.id ?? 'guest'}`;
  const [localProjects, setLocalProjects] = useLocalStorage<ApiFinanceProject[]>(storageKey, []);
  const [projects, setProjects] = useState<ApiFinanceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user) {
        setProjects(localProjects);
        setBackendOnline(false);
        setError(null);
        return;
      }
      const data = await financeProjectApi.getAll();
      setProjects(data);
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      setProjects(localProjects);
      setBackendOnline(false);
      setError(err instanceof Error ? err.message : 'Gagal memuat proyek keuangan');
    } finally {
      setLoading(false);
    }
  }, [authLoading, localProjects, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createProject = async (payload: ProjectDraft) => {
    if (backendOnline && user) {
      const created = await financeProjectApi.create(payload);
      setProjects((prev) => [created, ...prev]);
      return created;
    }

    const now = new Date().toISOString();
    const created: ApiFinanceProject = {
      ...payload,
      id: createLocalId('project'),
      createdAt: now,
      updatedAt: now,
    };
    setLocalProjects((prev) => [created, ...prev]);
    setProjects((prev) => [created, ...prev]);
    return created;
  };

  const updateProject = async (id: string, payload: Partial<ApiFinanceProject>) => {
    if (backendOnline && user) {
      const updated = await financeProjectApi.update(id, payload);
      setProjects((prev) => prev.map((project) => (project.id === id ? updated : project)));
      return updated;
    }

    let updatedProject: ApiFinanceProject | null = null;
    const applyUpdate = (prev: ApiFinanceProject[]) =>
      prev.map((project) => {
        if (project.id !== id) return project;
        updatedProject = { ...project, ...payload, updatedAt: new Date().toISOString() };
        return updatedProject;
      });
    setLocalProjects(applyUpdate);
    setProjects(applyUpdate);
    return updatedProject;
  };

  const deleteProject = async (id: string) => {
    if (backendOnline && user) {
      await financeProjectApi.delete(id);
    }
    setLocalProjects((prev) => prev.filter((project) => project.id !== id));
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'archived'),
    [projects],
  );

  return {
    projects,
    activeProjects,
    loading,
    error,
    backendOnline,
    createProject,
    updateProject,
    deleteProject,
    reload: loadData,
  };
}
