import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnsiklopediaView from '@/app/dashboard/ensiklopedia/_components/EnsiklopediaView';
import { shouldSubmitChatShortcut } from '@/controllers/ensiklopedia/useEnsiklopediaController';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

vi.mock('next-intl', () => ({
  useMessages: () => ({}),
}));

const theme = createTheme();

type EnsiklopediaViewProps = ComponentProps<typeof EnsiklopediaView>;
type EnsiklopediaViewTargetProps = EnsiklopediaViewProps & {
  handleRetryLastPrompt?: () => void;
  canRetryLastPrompt?: boolean;
};

const translations: Record<string, string> = {
  cause: 'Penyebab',
  symptoms: 'Gejala',
  inputPlaceholder: 'Tanyakan masalah cabai Anda...',
  inputLabel: 'Pesan untuk Arina AI',
  retryLastPrompt: 'Coba lagi',
  newChat: 'New Chat',
  sendMessage: 'Kirim pesan',
  sendingMessage: 'Arina AI sedang menjawab',
  composerHelper: 'Tekan Enter untuk baris baru, Ctrl/Cmd + Enter untuk mengirim. AI ini dilatih khusus untuk cabai rawit.',
  currentChatClear: 'Hapus chat saat ini',
  historyTitle: 'Riwayat Chat',
  historyOpen: 'Buka riwayat chat',
  historyClearAll: 'Hapus semua riwayat',
  historyClose: 'Tutup riwayat chat',
  historyDeleteSession: 'Hapus riwayat chat',
  historyEmpty: 'Belum ada riwayat percakapan.',
  'quickReference.title': 'Referensi Penyakit',
  'quickReference.risk': 'Risiko {value}',
  'welcome.title': 'Halo, saya Arina AI',
  'welcome.subtitle': 'Tanyakan penyakit, hama, atau budidaya cabai.',
  'prompts.p1': 'Bagaimana jadwal penyiraman cabai?',
  'prompts.p2': 'Apa tanda serangan hama trips?',
  'prompts.p3': 'Rekomendasi pupuk cabai fase berbunga',
  'prompts.p4': 'Kenapa daun cabai menguning?',
};

function formatTranslation(key: string, values?: Record<string, unknown>) {
  const template = translations[key] ?? key;
  if (!values) return template;
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), template);
}

function isTranslationValues(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function translateMessage(key: string, ...args: unknown[]) {
  const [values] = args;
  return formatTranslation(key, isTranslationValues(values) ? values : undefined);
}

const quickReferenceDiseases = [
  {
    id: 'gemini',
    name: 'Virus Gemini',
    severity: 'tinggi',
    loss: '80%',
    cause: 'Kutu kebul',
    symptoms: 'Daun menguning',
    treatment: 'Cabut tanaman berat dan kendalikan vektor.',
  },
];

const translate: EnsiklopediaViewProps['t'] = Object.assign(
  translateMessage,
  {
    rich: translateMessage,
    markup: translateMessage,
    raw: (key: string) => {
      if (key === 'quickReference.diseases') {
        return quickReferenceDiseases;
      }

      return [];
    },
    has: (key: string) => key in translations || key === 'quickReference.diseases',
  },
);

function renderView(overrides: Partial<EnsiklopediaViewTargetProps> = {}) {
  const props: EnsiklopediaViewTargetProps = {
    theme,
    t: translate,
    messages: [],
    diseaseModalOpen: false,
    setDiseaseModalOpen: vi.fn(),
    historyDrawerOpen: false,
    setHistoryDrawerOpen: vi.fn(),
    historyList: [],
    handleNewChat: vi.fn(),
    handleClearChat: vi.fn(),
    handleDeleteHistorySession: vi.fn(),
    handleClearHistory: vi.fn(),
    handleLoadHistory: vi.fn(),
    hasUserMessages: false,
    inputValue: '',
    setInputValue: vi.fn(),
    isTyping: false,
    chatError: null,
    messagesEndRef: { current: null },
    handleSend: vi.fn(),
    handleRetryLastPrompt: vi.fn(),
    handleKeyDown: vi.fn(),
    canRetryLastPrompt: false,
    ...overrides,
  };

  return render(
    <ThemeProvider theme={theme}>
      <EnsiklopediaView {...props} />
    </ThemeProvider>,
  );
}

describe('EnsiklopediaView', () => {
  it('uses semantic quick prompt controls that fill the composer', () => {
    const setInputValue = vi.fn();
    renderView({ setInputValue });

    fireEvent.click(screen.getByRole('button', { name: 'Bagaimana jadwal penyiraman cabai?' }));

    expect(setInputValue).toHaveBeenCalledWith('Bagaimana jadwal penyiraman cabai?');
  });

  it('exposes accessible composer and 44px touch target hooks', () => {
    renderView({ inputValue: 'Daun cabai menguning' });

    expect(screen.getByLabelText('Pesan untuk Arina AI')).toBeInTheDocument();
    const sendButton = screen.getByRole('button', { name: 'Kirim pesan' });
    expect(sendButton).toBeEnabled();
    expect(sendButton).toHaveAttribute('data-touch-target', '44');
    screen
      .getAllByRole('button', { name: 'New Chat' })
      .forEach((button) => expect(button).toHaveAttribute('data-touch-target', '44'));
    screen
      .getAllByRole('button', { name: 'Referensi Penyakit' })
      .forEach((button) => expect(button).toHaveAttribute('data-touch-target', '44'));
    expect(screen.getByRole('button', { name: 'Hapus chat saat ini' })).toHaveAttribute('data-touch-target', '44');
    expect(screen.getByText(/Ctrl\/Cmd \+ Enter untuk mengirim/)).toHaveAttribute('data-mobile-helper', 'desktop-only');
  });

  it('keeps Enter as a multiline key and sends only through Ctrl/Cmd+Enter shortcuts', () => {
    expect(shouldSubmitChatShortcut({ key: 'Enter', ctrlKey: false, metaKey: false })).toBe(false);
    expect(shouldSubmitChatShortcut({ key: 'Enter', ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldSubmitChatShortcut({ key: 'Enter', ctrlKey: false, metaKey: true })).toBe(true);
    expect(shouldSubmitChatShortcut({ key: 'a', ctrlKey: true, metaKey: false })).toBe(false);
  });

  it('starts a new chat from the header action', () => {
    const handleNewChat = vi.fn();
    renderView({ handleNewChat });

    fireEvent.click(screen.getAllByRole('button', { name: 'New Chat' })[0]);

    expect(handleNewChat).toHaveBeenCalled();
  });

  it('shows retry action when a failed prompt can be retried', () => {
    const handleRetryLastPrompt = vi.fn();
    renderView({
      chatError: 'Arina AI gagal merespons.',
      canRetryLastPrompt: true,
      handleRetryLastPrompt,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(handleRetryLastPrompt).toHaveBeenCalled();
  });

  it('renders history rows as buttons and destructive actions with labels', () => {
    const handleLoadHistory = vi.fn();
    const handleDeleteHistorySession = vi.fn();
    renderView({
      historyDrawerOpen: true,
      historyList: [
        {
          id: 'session-1',
          date: '1 Jun 2026',
          preview: 'Daun cabai menguning',
          messages: [{ id: 'm1', role: 'user', content: 'Daun cabai menguning', timestamp: '2026-06-01T00:00:00.000Z' }],
        },
      ],
      handleLoadHistory,
      handleDeleteHistorySession,
    });

    fireEvent.click(screen.getByRole('button', { name: /Daun cabai menguning/i }));
    expect(handleLoadHistory).toHaveBeenCalled();
    handleLoadHistory.mockClear();

    const deleteButton = screen.getByRole('button', { name: 'Hapus riwayat chat' });
    fireEvent.keyDown(deleteButton, { key: 'Enter' });
    expect(handleLoadHistory).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);
    expect(handleDeleteHistorySession).toHaveBeenCalledWith('session-1');
  });
});
