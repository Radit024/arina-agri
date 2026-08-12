'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import useSessionStorage from '@/hooks/useSessionStorage';
import { financeProjectApi, type ApiFinanceProject } from '@/lib/api';

type ProjectDraft = Omit<ApiFinanceProject, 'id' | 'createdAt' | 'updatedAt'>;

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useFinanceProjects() {
  const { user, loading: authLoading, isGuestMode } = useAuth();
  const storageKey = `arina-finance-projects-${user?.id ?? 'guest'}`;
  const [localProjects, setLocalProjects] = useSessionStorage<ApiFinanceProject[]>(storageKey, []);
  const [projects, setProjects] = useState<ApiFinanceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);

  const localProjectsRef = useRef(localProjects);
  useEffect(() => {
    localProjectsRef.current = localProjects;
  }, [localProjects]);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (!user || isGuestMode) {
        setProjects(localProjectsRef.current);
        setBackendOnline(false);
        setError(null);
        return;
      }
      const data = await financeProjectApi.getAll();
      setProjects(data);
      setBackendOnline(true);
      setError(null);
    } catch (err) {
      setProjects(localProjectsRef.current);
      setBackendOnline(false);
      setError(err instanceof Error ? err.message : 'Gagal memuat proyek keuangan');
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, isGuestMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createProject = async (payload: ProjectDraft) => {
    if (backendOnline && user && !isGuestMode) {
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
    if (backendOnline && user && !isGuestMode) {
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
    if (backendOnline && user && !isGuestMode) {
      await financeProjectApi.delete(id);
    }
    const remaining = localProjectsRef.current.filter((project) => project.id !== id);
    localProjectsRef.current = remaining;
    setLocalProjects(remaining);
    setProjects(remaining);

    try {
      if (typeof window !== 'undefined') {
        const userId = user?.id ?? 'guest';
        const currentSelected = window.localStorage.getItem('arina-selected-finance-project');
        if (currentSelected && (currentSelected === id || currentSelected.includes(id))) {
          window.localStorage.removeItem('arina-selected-finance-project');
        }
        window.sessionStorage.removeItem(`arina-scenario-rab-${userId}-${id}`);
        window.sessionStorage.removeItem(`arina-scenario-rab-${userId}-guest-proj-${id}`);
        window.sessionStorage.removeItem(`arina-scenario-rab-${userId}-guest-real-${id}`);
        window.sessionStorage.removeItem(`arina-scenario-transactions-guest-proj-${id}`);
        window.sessionStorage.removeItem(`arina-scenario-transactions-guest-real-${id}`);
        window.sessionStorage.removeItem(`arina-scenario-transactions-${id}`);
        window.sessionStorage.removeItem(`arina-finance-scenario-mode-${id}`);
      }
    } catch {
      // Storage cleanup failure is optional
    }
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
