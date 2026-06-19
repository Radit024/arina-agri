import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import KalenderView from '@/app/dashboard/kalender/_components/KalenderView';
import type { EventFormData } from '@/app/dashboard/kalender/_lib/eventSchema';
import type { ApiCalendarEvent } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      addSchedule: 'Tambah Jadwal',
      cancel: 'Batal',
      delete: 'Hapus',
      emptyUpcoming: 'Belum ada jadwal mendatang',
      loading: 'Memuat jadwal',
      more: 'lagi',
      next7Days: '7 hari ke depan',
      retry: 'Coba lagi',
      saveSchedule: 'Simpan Jadwal',
      subtitle: 'Jadwal kegiatan pertanian Anda',
      title: 'Smart Kalender',
      today: 'Hari ini',
      upcomingTitle: 'Jadwal Mendatang',
      'dialog.addTitle': 'Tambah Jadwal Kegiatan',
      'dialog.close': 'Tutup dialog jadwal',
      'dialog.editTitle': 'Edit Jadwal Kegiatan',
      'dialog.fields.date': 'Tanggal',
      'dialog.fields.noteOptional': 'Catatan (opsional)',
      'dialog.fields.notePlaceholder': 'Tambahkan catatan tambahan...',
      'dialog.fields.scheduleTimeGroup': 'Tanggal dan waktu jadwal',
      'dialog.fields.timeOptional': 'Waktu (opsional)',
      'dialog.fields.title': 'Judul Kegiatan',
      'dialog.fields.titlePlaceholder': 'Contoh: Pemupukan Susulan NPK',
      'dialog.fields.type': 'Jenis Kegiatan',
      'dialog.options.fertilizing': 'Pemupukan',
      'dialog.options.harvest': 'Pemetikan/Panen',
      'dialog.options.irrigation': 'Irigasi',
      'dialog.options.other': 'Lainnya',
      'dialog.options.spraying': 'Penyemprotan Pestisida',
    };

    return (key: string) => translations[key] ?? key;
  },
}));

const calendarEvent: ApiCalendarEvent = {
  _id: 'event-1',
  judul: 'Pemupukan',
  jenis: 'pemupukan',
  tanggal: '2026-05-31',
  waktu: '08:00',
  catatan: 'Pupuk NPK',
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
};

function KalenderViewHarness({
  dialogOpen = false,
  error = null,
  loading = false,
  openAddDialog = vi.fn(),
  openEditDialog = vi.fn(),
  onRetry = vi.fn(),
  upcomingEvents = [],
}: {
  dialogOpen?: boolean;
  error?: string | null;
  loading?: boolean;
  openAddDialog?: (dateStr?: string) => void;
  openEditDialog?: (event: ApiCalendarEvent) => void;
  onRetry?: () => void;
  upcomingEvents?: ApiCalendarEvent[];
}) {
  const form = useForm<EventFormData>({
    defaultValues: { judul: '', jenis: 'pemupukan', tanggal: '2026-05-31', waktu: '', catatan: '' },
  });

  return (
    <KalenderView
      calendarCells={[31]}
      control={form.control}
      currentDate={new Date('2026-05-31T00:00:00.000Z')}
      dayNames={['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']}
      dialogOpen={dialogOpen}
      editingEventId={null}
      error={error}
      errors={form.formState.errors}
      getDateStr={(day) => `2026-05-${String(day).padStart(2, '0')}`}
      getEventsForDate={() => [calendarEvent]}
      handleDelete={vi.fn()}
      handleSubmit={form.handleSubmit}
      jenisLabels={{
        pemupukan: 'Pemupukan',
        penyemprotan: 'Penyemprotan',
        irigasi: 'Irigasi',
        pemetikan: 'Pemetikan/Panen',
        lainnya: 'Lainnya',
      }}
      loading={loading}
      month={4}
      monthNames={['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']}
      onRetry={onRetry}
      onSubmit={vi.fn()}
      openAddDialog={openAddDialog}
      openEditDialog={openEditDialog}
      setCurrentDate={vi.fn()}
      setDialogOpen={vi.fn()}
      todayStr="2026-05-31"
      upcomingEvents={upcomingEvents}
      weatherPlanningNote=""
      weatherWarningMessage=""
      year={2026}
    />
  );
}

describe('KalenderView', () => {
  it('shows loading and recoverable error states without hiding the calendar', () => {
    const onRetry = vi.fn();
    render(<KalenderViewHarness error="Gagal memuat jadwal" loading onRetry={onRetry} />);

    expect(screen.getByLabelText('Memuat jadwal')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat jadwal');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tambah jadwal 31 Mei 2026' })).toBeInTheDocument();
  });

  it('keeps mobile spacing hooks and semantic day/event actions', () => {
    const openAddDialog = vi.fn();
    const openEditDialog = vi.fn();
    render(<KalenderViewHarness openAddDialog={openAddDialog} openEditDialog={openEditDialog} />);

    expect(screen.getByTestId('calendar-page-root')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-day-cell')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah jadwal 31 Mei 2026' }));
    expect(openAddDialog).toHaveBeenCalledWith('2026-05-31');

    fireEvent.click(screen.getByRole('button', { name: 'Edit jadwal Pemupukan' }));
    expect(openEditDialog).toHaveBeenCalledWith(calendarEvent);
  });

  it('uses icon-backed category labels and 44px touch target hooks in the dialog', () => {
    const { container } = render(<KalenderViewHarness dialogOpen />);

    expect(screen.getByRole('dialog', { name: 'Tambah Jadwal Kegiatan' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tanggal dan waktu jadwal' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('31-05-2026')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[🌿💧🚿🌶📝📅]/u);
    expect(container.querySelectorAll('[data-touch-target="44"]').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Jadwal' })).toBeInTheDocument();
  });
});
