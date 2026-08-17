import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ResponsiveDataView from '@/components/ui/ResponsiveDataView';

const sampleItems = [
  { id: 'fertilizer', name: 'Pupuk Urea' },
  { id: 'seed', name: 'Benih Padi' },
];

describe('ResponsiveDataView', () => {
  it('keeps both responsive branches in the DOM when ready data is available', () => {
    render(
      <ResponsiveDataView
        data={sampleItems}
        desktop={<div data-testid="desktop-view">Tabel RAB desktop</div>}
        getItemKey={(item) => item.id}
        renderMobileItem={(item) => <article aria-label={`Item ${item.name}`}>{item.name}</article>}
      />,
    );

    expect(screen.getByTestId('desktop-view')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Item Pupuk Urea' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Item Benih Padi' })).toBeInTheDocument();
  });

  it.each([
    ['loading', 'Memuat RAB', 'status'],
    ['empty', 'Belum ada item yang sesuai.', 'status'],
    ['error', 'RAB tidak dapat dimuat.', 'alert'],
  ] as const)('uses ContentState for %s and hides responsive children', (state, message, role) => {
    render(
      <ResponsiveDataView
        data={sampleItems}
        desktop={<div data-testid="desktop-view">Tabel RAB desktop</div>}
        emptyMessage="Belum ada item yang sesuai."
        errorMessage="RAB tidak dapat dimuat."
        getItemKey={(item) => item.id}
        loadingLabel="Memuat RAB"
        renderMobileItem={(item) => <article aria-label={`Item ${item.name}`}>{item.name}</article>}
        retry={state === 'error' ? <button type="button">Coba lagi</button> : undefined}
        state={state}
      />,
    );

    expect(screen.getByRole(role)).toHaveTextContent(message);
    expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Item Pupuk Urea' })).not.toBeInTheDocument();
    if (state === 'error') expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });
});
