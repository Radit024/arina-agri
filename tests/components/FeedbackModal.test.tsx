import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedbackModal from '@/components/shared/FeedbackModal';

const fetchMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const labels: Record<string, string> = {
      title: 'Beri Masukan',
      subtitle: 'Bantu kami meningkatkan aplikasi Arina Agri dengan masukan Anda.',
      'fields.category': 'Kategori',
      'fields.message': 'Pesan / Masukan',
      'fields.messagePlaceholder': 'Ceritakan detail masukan Anda...',
      'categories.bug': 'Lapor Bug / Error',
      'categories.feature': 'Usulan Fitur Baru',
      'categories.question': 'Pertanyaan',
      cancel: 'Batal',
      submit: 'Kirim Masukan',
      submitting: 'Mengirim...',
      success: 'Terima kasih! Masukan Anda telah berhasil dikirim.',
      error: 'Gagal mengirim masukan. Silakan coba lagi.',
      tabForm: 'Tulis Masukan',
      tabList: 'Daftar Masukan',
      emptyList: 'Belum ada masukan. Jadilah yang pertama!',
      errorFetch: 'Gagal mengambil daftar masukan.',
      'formatting.label': 'Format markdown',
      'formatting.bold': 'Bold',
      'formatting.italic': 'Italic',
      'formatting.bulletList': 'Bullet list',
      'formatting.numberedList': 'Numbered list',
      'formatting.quote': 'Quote',
      'formatting.code': 'Code',
      'formatting.previewTitle': 'Preview',
      'formatting.previewEmpty': 'Preview markdown akan muncul di sini.',
      'formatting.helper': 'Gunakan markdown: **tebal**, _miring_, - list, `kode`, atau > kutipan.',
      locale: 'id',
    };

    return (key: string) => labels[key] ?? key;
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    session: {
      access_token: 'token-123',
    },
  }),
}));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('FeedbackModal', () => {
  it('renders markdown formatting in the feedback list', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'feedback-1',
            category: 'bug',
            message: '**Bagian penting**\n\n- Poin pertama\n- Poin kedua',
            created_at: '2026-06-05T13:33:00.000Z',
            user_name: 'Andin',
            device_type: 'mobile',
          },
        ],
      }),
    });

    render(<FeedbackModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Daftar Masukan' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/feedback', {
        headers: {
          Authorization: 'Bearer token-123',
        },
      });
    });

    const strongText = await screen.findByText('Bagian penting');
    expect(strongText.tagName).toBe('STRONG');
    expect(screen.queryByText('**Bagian penting**')).not.toBeInTheDocument();

    const firstPoint = screen.getByText('Poin pertama');
    expect(firstPoint.tagName).toBe('LI');
  });

  it('adds markdown syntax from the formatting toolbar', () => {
    render(<FeedbackModal open onClose={vi.fn()} />);

    const messageInput = screen.getByLabelText('Pesan / Masukan') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'rapi' } });
    messageInput.focus();
    messageInput.setSelectionRange(0, 4);

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(messageInput).toHaveValue('**rapi**');
    const previewText = screen.getByText('rapi');
    expect(previewText.tagName).toBe('STRONG');
  });
});
