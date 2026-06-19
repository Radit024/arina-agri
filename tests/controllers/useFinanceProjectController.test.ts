import { describe, expect, it } from 'vitest';

import { resolveFinanceProjectSelection } from '@/controllers/keuangan/useFinanceProjectController';

const activeProject = {
  id: 'project-active',
  name: 'Cabai Musim 1',
  commodity: 'Cabai',
  landArea: 1,
  landAreaUnit: 'Ha',
  seasonLabel: 'Musim 2026',
  startDate: '2026-06-01',
  endDate: '2026-09-30',
  status: 'active' as const,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('resolveFinanceProjectSelection', () => {
  it('does not expose a stored project id while options are still empty', () => {
    const selection = resolveFinanceProjectSelection({
      activeProjects: [],
      loading: true,
      projects: [],
      selectedProjectId: '790300ba-7b48-410c-8282-d2a8b9a4f8d7',
    });

    expect(selection.selectedProjectId).toBeNull();
    expect(selection.selectedProject).toBeNull();
    expect(selection.nextSelectedProjectId).toBe('790300ba-7b48-410c-8282-d2a8b9a4f8d7');
  });

  it('replaces a stale stored project id with the first active project after loading', () => {
    const selection = resolveFinanceProjectSelection({
      activeProjects: [activeProject],
      loading: false,
      projects: [activeProject],
      selectedProjectId: '790300ba-7b48-410c-8282-d2a8b9a4f8d7',
    });

    expect(selection.selectedProjectId).toBeNull();
    expect(selection.selectedProject).toBeNull();
    expect(selection.nextSelectedProjectId).toBe(activeProject.id);
  });
});
