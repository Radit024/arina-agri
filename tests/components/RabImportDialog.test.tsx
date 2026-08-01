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
    importRabFile: vi.fn(),
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
    render(<RabImportDialog rab={rab} />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const file = makeXlsxFile('rab-drag.xlsx');

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByText('rab-drag.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import/ })).toBeEnabled();
    expect(rab.setImportError).toHaveBeenCalledWith(null);
  });

  it('shows drag-active styling while a file is dragged over the drop zone', () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    fireEvent.dragOver(dropZone);

    expect(screen.getByText('Lepas file di sini')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(screen.getByText(/Klik atau seret file/)).toBeInTheDocument();
  });

  it('rejects a dropped file that is not .xlsx', () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const badFile = new File(['dummy'], 'notes.pdf', { type: 'application/pdf' });

    fireEvent.drop(dropZone, { dataTransfer: { files: [badFile] } });

    expect(rab.setImportError).toHaveBeenCalledWith('Format file tidak didukung. Unggah file Excel (.xlsx).');
    expect(screen.queryByText('notes.pdf')).not.toBeInTheDocument();
  });

  it('calls importRabFile with the dropped file when Import is clicked', async () => {
    const rab = makeRab();
    render(<RabImportDialog rab={rab} />);

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const file = makeXlsxFile('rab-drag.xlsx');
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Import/ }));

    expect(rab.importRabFile).toHaveBeenCalledWith(file);
  });

  it('shows a loading animation over the drop zone and disables interaction while importing', () => {
    const rab = makeRab({ importLoading: true });
    render(<RabImportDialog rab={rab} />);

    expect(screen.getByText('Menyimpan item RAB dan transaksi, mohon tunggu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mengimpor/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();

    const dropZone = screen.getByText(/Klik atau seret file/).closest('div')!;
    const file = makeXlsxFile('should-be-ignored.xlsx');
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.queryByText('should-be-ignored.xlsx')).not.toBeInTheDocument();
  });
});
