import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import EnsiklopediaMessagesView, { type EnsiklopediaMessagesViewProps } from '@/app/dashboard/ensiklopedia/_components/EnsiklopediaMessagesView';
import ChatMarkdownRenderer from '@/app/dashboard/ensiklopedia/_components/ChatMarkdownRenderer';
import type { ChatMessage } from '@/controllers/ensiklopedia/chatHistory';

vi.mock('next-intl', () => ({
  useMessages: () => ({}),
}));

vi.mock('next/dynamic', () => ({
  default: () => function DynamicMarkdownStub(props: { content: string }) {
    return <ChatMarkdownRenderer {...props} />;
  },
}));

const theme = createTheme();

const translations: Record<string, string> = {
  retryLastPrompt: 'Coba lagi',
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

const translate: EnsiklopediaMessagesViewProps['t'] = Object.assign(
  translateMessage,
  {
    rich: translateMessage,
    markup: translateMessage,
    raw: () => [],
    has: (key: string) => key in translations,
  },
);

function renderMessagesView(overrides: Partial<EnsiklopediaMessagesViewProps> = {}) {
  const props: EnsiklopediaMessagesViewProps = {
    theme,
    t: translate,
    messages: [],
    hasUserMessages: false,
    isTyping: false,
    chatError: null,
    canRetryLastPrompt: false,
    handleRetryLastPrompt: vi.fn(),
    messagesEndRef: { current: null },
    setInputValue: vi.fn(),
    reduceMotion: false,
    ...overrides,
  };

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <EnsiklopediaMessagesView {...props} />
      </ThemeProvider>,
    ),
    props,
  };
}

describe('EnsiklopediaMessagesView', () => {
  describe('Welcome screen / empty state', () => {
    it('renders welcome title, subtitle, and 4 quick prompt suggestions when hasUserMessages is false', () => {
      const setInputValue = vi.fn();
      renderMessagesView({ hasUserMessages: false, setInputValue });

      expect(screen.getByText('Halo, saya Arina AI')).toBeInTheDocument();
      expect(screen.getByText('Tanyakan penyakit, hama, atau budidaya cabai.')).toBeInTheDocument();

      const quickPromptsContainer = document.querySelector('[data-guide-target="ai-quick-prompts"]');
      expect(quickPromptsContainer).toBeInTheDocument();

      const prompt1 = screen.getByRole('button', { name: /Bagaimana jadwal penyiraman cabai\?/i });
      const prompt2 = screen.getByRole('button', { name: /Apa tanda serangan hama trips\?/i });
      const prompt3 = screen.getByRole('button', { name: /Rekomendasi pupuk cabai fase berbunga/i });
      const prompt4 = screen.getByRole('button', { name: /Kenapa daun cabai menguning\?/i });

      expect(prompt1).toHaveAttribute('data-touch-target', '44');
      expect(prompt2).toHaveAttribute('data-touch-target', '44');
      expect(prompt3).toHaveAttribute('data-touch-target', '44');
      expect(prompt4).toHaveAttribute('data-touch-target', '44');

      fireEvent.click(prompt1);
      expect(setInputValue).toHaveBeenCalledWith('Bagaimana jadwal penyiraman cabai?');

      fireEvent.click(prompt2);
      expect(setInputValue).toHaveBeenCalledWith('Apa tanda serangan hama trips?');

      fireEvent.click(prompt3);
      expect(setInputValue).toHaveBeenCalledWith('Rekomendasi pupuk cabai fase berbunga');

      fireEvent.click(prompt4);
      expect(setInputValue).toHaveBeenCalledWith('Kenapa daun cabai menguning?');

      expect(setInputValue).toHaveBeenCalledTimes(4);
    });

    it('does not render welcome screen when hasUserMessages is true', () => {
      const userMessage: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Halo Arina',
        timestamp: '2026-10-03T00:00:00.000Z',
      };

      renderMessagesView({
        hasUserMessages: true,
        messages: [userMessage],
      });

      expect(screen.queryByText('Halo, saya Arina AI')).not.toBeInTheDocument();
      expect(screen.queryByText('Tanyakan penyakit, hama, atau budidaya cabai.')).not.toBeInTheDocument();
      expect(document.querySelector('[data-guide-target="ai-quick-prompts"]')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility and motion', () => {
    it('applies fadeIn animation to welcome screen when reduceMotion is false', () => {
      const { container } = renderMessagesView({
        hasUserMessages: false,
        reduceMotion: false,
      });
      const welcomeBox = container.querySelector('[data-guide-target="ai-quick-prompts"]')?.parentElement;
      expect(welcomeBox).toBeTruthy();
      expect(window.getComputedStyle(welcomeBox!).animation).toContain('fadeIn');
    });

    it('disables animation (animation: none) on welcome screen when reduceMotion is true', () => {
      const { container } = renderMessagesView({
        hasUserMessages: false,
        reduceMotion: true,
      });
      const welcomeBox = container.querySelector('[data-guide-target="ai-quick-prompts"]')?.parentElement;
      expect(welcomeBox).toBeTruthy();
      expect(window.getComputedStyle(welcomeBox!).animation).toBe('none');
    });

    it('applies slideUpFadeIn and bounce animations to messages and typing indicator when reduceMotion is false', () => {
      const sampleMessages: ChatMessage[] = [
        {
          id: 'user-1',
          role: 'user',
          content: 'Berapa pH ideal tanah cabai?',
          timestamp: '2026-10-03T00:00:00.000Z',
        },
      ];

      renderMessagesView({
        hasUserMessages: true,
        messages: sampleMessages,
        isTyping: true,
        reduceMotion: false,
      });

      const messageText = screen.getByText('Berapa pH ideal tanah cabai?');
      const messageRow = messageText.closest('div[class*="MuiBox-root"]')?.parentElement?.parentElement;
      expect(messageRow).toBeTruthy();
      expect(window.getComputedStyle(messageRow!).animation).toContain('slideUpFadeIn');

      const avatarIcon = screen.getByTestId('AutoAwesomeIcon');
      const typingRow = avatarIcon.closest('div[class*="MuiBox-root"]')?.parentElement;
      expect(typingRow).toBeTruthy();
      expect(window.getComputedStyle(typingRow!).animation).toContain('slideUpFadeIn');

      const dotsWrapper = typingRow!.lastElementChild?.firstElementChild;
      expect(dotsWrapper?.children.length).toBe(3);
      Array.from(dotsWrapper!.children).forEach((dot) => {
        expect(window.getComputedStyle(dot).animation).toContain('bounce');
      });
    });

    it('disables animations (animation: none) on messages and typing indicator when reduceMotion is true', () => {
      const sampleMessages: ChatMessage[] = [
        {
          id: 'user-1',
          role: 'user',
          content: 'Berapa pH ideal tanah cabai?',
          timestamp: '2026-10-03T00:00:00.000Z',
        },
      ];

      renderMessagesView({
        hasUserMessages: true,
        messages: sampleMessages,
        isTyping: true,
        reduceMotion: true,
      });

      const messageText = screen.getByText('Berapa pH ideal tanah cabai?');
      const messageRow = messageText.closest('div[class*="MuiBox-root"]')?.parentElement?.parentElement;
      expect(messageRow).toBeTruthy();
      expect(window.getComputedStyle(messageRow!).animation).toBe('none');

      const avatarIcon = screen.getByTestId('AutoAwesomeIcon');
      const typingRow = avatarIcon.closest('div[class*="MuiBox-root"]')?.parentElement;
      expect(typingRow).toBeTruthy();
      expect(window.getComputedStyle(typingRow!).animation).toBe('none');

      const dotsWrapper = typingRow!.lastElementChild?.firstElementChild;
      expect(dotsWrapper?.children.length).toBe(3);
      Array.from(dotsWrapper!.children).forEach((dot) => {
        expect(window.getComputedStyle(dot).animation).toBe('none');
      });
    });
  });

  describe('Typing indicator', () => {
    it('shows typing indicator with 3 bouncing dots and Arina AI avatar when isTyping is true', () => {
      renderMessagesView({
        hasUserMessages: true,
        isTyping: true,
      });

      // AI Avatar icon inside typing indicator
      const avatarIcon = screen.getByTestId('AutoAwesomeIcon');
      expect(avatarIcon).toBeInTheDocument();

      const avatarBox = avatarIcon.closest('div[class*="MuiBox-root"]');
      expect(avatarBox).toHaveStyle({
        borderRadius: '40%',
      });

      // 3 bouncing dots
      const typingRow = avatarBox?.parentElement;
      const dotsWrapper = typingRow?.lastElementChild?.firstElementChild;
      expect(dotsWrapper).toBeInTheDocument();
      expect(dotsWrapper?.children.length).toBe(3);

      Array.from(dotsWrapper!.children).forEach((dot) => {
        expect(dot).toHaveStyle({
          width: '8px',
          height: '8px',
          borderRadius: '50%',
        });
      });
    });

    it('does not render typing indicator when isTyping is false', () => {
      const { container } = renderMessagesView({
        hasUserMessages: true,
        isTyping: false,
      });

      // No typing indicator container
      const dots = container.querySelectorAll('div[style*="border-radius: 50%"]');
      expect(dots.length).toBe(0);
    });
  });

  describe('Message rendering', () => {
    it('renders User messages with bubble styling, right-aligned layout, and pre-line text', () => {
      const userMessage: ChatMessage = {
        id: 'user-msg-1',
        role: 'user',
        content: 'Baris pertama cabai\nBaris kedua perawatan',
        timestamp: '2026-10-03T00:00:00.000Z',
      };

      const { container } = renderMessagesView({
        hasUserMessages: true,
        messages: [userMessage],
      });

      const messageText = screen.getByText(/Baris pertama cabai/);
      expect(messageText).toBeInTheDocument();
      expect(messageText).toHaveStyle({
        whiteSpace: 'pre-line',
      });

      // User bubble container has 24px 24px 4px 24px border radius
      const userBubble = messageText.parentElement;
      expect(userBubble).toHaveStyle({
        borderRadius: '24px 24px 4px 24px',
      });

      // Message row wrapper is right-aligned
      const messageRow = userBubble?.parentElement?.parentElement;
      expect(messageRow).toHaveStyle({
        justifyContent: 'flex-end',
      });

      // AI avatar is NOT present for user message
      expect(container.querySelector('[aria-label="Jawaban Arina AI"]')).not.toBeInTheDocument();
    });

    it('renders AI messages with squircle avatar, left-aligned layout, and accessible article', () => {
      const aiMessage: ChatMessage = {
        id: 'ai-msg-1',
        role: 'ai',
        content: '## Panduan Pemupukan\nGunakan pupuk NPK dengan dosis tepat.',
        timestamp: '2026-10-03T00:01:00.000Z',
      };

      renderMessagesView({
        hasUserMessages: true,
        messages: [aiMessage],
      });

      // Accessible article
      const article = screen.getByRole('article', { name: 'Jawaban Arina AI' });
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute('data-ai-markdown', 'readable');

      // AI markdown content rendered
      expect(screen.getByRole('heading', { level: 2, name: 'Panduan Pemupukan' })).toBeInTheDocument();
      expect(screen.getByText('Gunakan pupuk NPK dengan dosis tepat.')).toBeInTheDocument();

      // AI avatar (squircle with AutoAwesomeIcon)
      const avatarIcon = screen.getByTestId('AutoAwesomeIcon');
      const avatarBox = avatarIcon.closest('div[class*="MuiBox-root"]');
      expect(avatarBox).toHaveStyle({
        borderRadius: '40%',
      });

      // AI message row wrapper is left-aligned
      const messageRow = article.parentElement?.parentElement;
      expect(messageRow).toHaveStyle({
        justifyContent: 'flex-start',
      });
    });

    it('renders conversation thread with both User and AI messages in order', () => {
      const messages: ChatMessage[] = [
        {
          id: 'm1',
          role: 'user',
          content: 'Halo AI, apa itu trips?',
          timestamp: '2026-10-03T00:00:00.000Z',
        },
        {
          id: 'm2',
          role: 'ai',
          content: 'Trips adalah hama serangga kecil pengisap cairan daun cabai.',
          timestamp: '2026-10-03T00:01:00.000Z',
        },
        {
          id: 'm3',
          role: 'user',
          content: 'Bagaimana pengendaliannya?',
          timestamp: '2026-10-03T00:02:00.000Z',
        },
      ];

      renderMessagesView({
        hasUserMessages: true,
        messages,
      });

      expect(screen.getByText('Halo AI, apa itu trips?')).toBeInTheDocument();
      expect(screen.getByText('Trips adalah hama serangga kecil pengisap cairan daun cabai.')).toBeInTheDocument();
      expect(screen.getByText('Bagaimana pengendaliannya?')).toBeInTheDocument();
    });
  });

  describe('Error alert & Retry', () => {
    it('displays Alert with chatError and retry button when canRetryLastPrompt is true, calling handleRetryLastPrompt on click', () => {
      const handleRetryLastPrompt = vi.fn();
      renderMessagesView({
        chatError: 'Koneksi ke AI terputus. Silakan coba lagi.',
        canRetryLastPrompt: true,
        handleRetryLastPrompt,
      });

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Koneksi ke AI terputus. Silakan coba lagi.');

      const retryButton = screen.getByRole('button', { name: 'Coba lagi' });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(handleRetryLastPrompt).toHaveBeenCalledOnce();
    });

    it('displays Alert with chatError but hides retry button when canRetryLastPrompt is false', () => {
      renderMessagesView({
        chatError: 'Terjadi kesalahan sistem internal.',
        canRetryLastPrompt: false,
      });

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Terjadi kesalahan sistem internal.');
      expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument();
    });

    it('does not display Alert when chatError is null', () => {
      renderMessagesView({
        chatError: null,
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Messages end anchor ref', () => {
    it('attaches messagesEndRef to the scroll anchor element', () => {
      const messagesEndRef = { current: null as HTMLDivElement | null };
      renderMessagesView({
        messagesEndRef,
      });

      expect(messagesEndRef.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
