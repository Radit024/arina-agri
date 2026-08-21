import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RabImportDialog from '@/app/dashboard/keuangan/_components/RabImportDialog';

function makeRab(overrides: Partial<Parameters<typeof RabImportDialog>[0]['rab']> = {}) {
  return {
    importDialogOpen: true,
    setImportDialogOpen: vi.fn(),
    importLoading: false,
    importError: null,
    setImportError: vi.fn(),
    importWarnings: [],
    setImportWarnings: vi.fn(),
    importRabFile: vi.fn(),
    preflightData: null,
    setPreflightData: vi.fn(),
    preflightFile: null,
    importSummary: null,
    setImportSummary: vi.fn(),
    confirmPreflightAndImport: vi.fn(),
    resetImportState: vi.fn(),
    ...overrides,
  } as Parameters<typeof RabImportDialog>[0]['rab'];
}

function makeXlsxFile(name = 'rab.xlsx') {
  return new File(['dummy content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('RabImportDialog', () => {
  it('accepts a file dropped onto the drop zone and enables Import', () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const file = makeXlsxFile('rab-drag.xlsx');

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByText('rab-drag.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lanjutkan Impor/ })).toBeEnabled();
    expect(rab.setImportError).toHaveBeenCalledWith(null);
  });

  it('shows drag-active styling while a file is dragged over the drop zone', () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    fireEvent.dragOver(dropZone);

    expect(screen.getByText('Lepas file di sini')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(screen.getByText(/Klik atau seret file/)).toBeInTheDocument();
  });

  it('rejects a dropped file that is not .xlsx', () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const badFile = new File(['dummy'], 'notes.pdf', { type: 'application/pdf' });

    fireEvent.drop(dropZone, { dataTransfer: { files: [badFile] } });

    expect(rab.setImportError).toHaveBeenCalledWith('Format file tidak didukung. Unggah file Excel (.xlsx).');
    expect(screen.queryByText('notes.pdf')).not.toBeInTheDocument();
  });

  it('calls importRabFile with the dropped file when Lanjutkan Impor is clicked', async () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const file = makeXlsxFile('rab-drag.xlsx');
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Lanjutkan Impor/ }));

    expect(rab.importRabFile).toHaveBeenCalledWith(file, 'default');
  });

  it('shows a loading animation over the drop zone and disables interaction while importing', () => {
    const rab = makeRab({ importLoading: true });
    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    expect(screen.getAllByText(/Membaca/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Membaca File/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const file = makeXlsxFile('should-be-ignored.xlsx');
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.queryByText('should-be-ignored.xlsx')).not.toBeInTheDocument();
  });

  it('shows preflight review when preflightData is present and calls confirmPreflightAndImport on confirm', () => {
    const confirmPreflightAndImport = vi.fn();
    const sampleFile = makeXlsxFile('rab-sample.xlsx');
    const rab = makeRab({
      preflightData: {
        project: { id: 'p1', name: 'Proyek Padi', commodity: 'Padi', landArea: 1, landAreaUnit: 'Ha', seasonLabel: '2026', startDate: '2026-01-01', endDate: '2026-04-30', status: 'active' },
        categories: [
          { id: 'cat-saprodi', projectId: 'p1', name: 'SAPRODI', type: 'expense', sortOrder: 1 },
        ],
        items: [{ id: 'item-1', projectId: 'p1', categoryId: 'cat-saprodi', categoryName: 'SAPRODI', type: 'expense', name: 'Bibit', volume: 1, unit: 'kg', unitPrice: 500000, plannedTotal: 500000, sortOrder: 1, aliases: [] }],
        transactions: [],
        skippedRows: [],
        reconciliation: [
          { categoryId: 'cat-saprodi', categoryName: 'SAPRODI', declaredTotal: 500000, computedTotal: 500000, difference: 0 },
        ],
        warnings: [],
      },
      preflightFile: sampleFile,
      confirmPreflightAndImport,
    });

    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    expect(screen.getByText('Pemeriksaan Total per Kelompok Biaya')).toBeInTheDocument();
    expect(screen.getByText('SAPRODI')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Konfirmasi & Simpan ke Sistem' });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    expect(confirmPreflightAndImport).toHaveBeenCalled();
  });

  it('shows import summary results when importSummary is present', () => {
    const rab = makeRab({
      importSummary: {
        projectName: 'Proyek Padi',
        importedItemsCount: 5,
        importedTransactionCount: 12,
        skippedCount: 0,
        warnings: ['Peringatan rekonsiliasi non-kritis'],
        reconciliation: [],
        skippedRows: [],
      },
    });

    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    expect(screen.getByText('Hasil Impor Excel')).toBeInTheDocument();
    expect(screen.getByText('Impor Berhasil Disimpan')).toBeInTheDocument();
    expect(screen.getByText('Item RAB Dibuat')).toBeInTheDocument();
    expect(screen.getByText('Transaksi Dicatat')).toBeInTheDocument();

    const finishBtn = screen.getByRole('button', { name: 'Selesai' });
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);

    expect(rab.resetImportState).toHaveBeenCalled();
    expect(rab.setImportDialogOpen).toHaveBeenCalledWith(false);
  });

  it('resets import state and closes when Batal is clicked', () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} scenarios={[]} activeScenarioId="default" />);

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    expect(rab.resetImportState).toHaveBeenCalled();
    expect(rab.setImportDialogOpen).toHaveBeenCalledWith(false);
  });
});
