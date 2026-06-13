export const GUIDE_STORAGE_VERSION = 'v1';

export type GuideId =
  | 'global'
  | 'finance'
  | 'stock'
  | 'weather'
  | 'market'
  | 'encyclopedia'
  | 'calendar'
  | 'settings';

export type GuidePlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface GuideStepDefinition {
  key: string;
  target: string | string[];
  placement?: GuidePlacement;
}

export interface GuideDefinition {
  id: GuideId;
  messageKey: string;
  steps: GuideStepDefinition[];
  route?: string;
}

export type GuideStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const GLOBAL_GUIDE: GuideDefinition = {
  id: 'global',
  messageKey: 'global',
  steps: [
    { key: 'dashboard', target: 'nav-dashboard', placement: 'right' },
    { key: 'finance', target: 'nav-keuangan', placement: 'right' },
    { key: 'operations', target: ['nav-stok', 'mobile-feature-stok', 'nav-lainnya'], placement: 'right' },
    { key: 'weather', target: ['nav-cuaca', 'mobile-feature-cuaca', 'nav-lainnya'], placement: 'right' },
    { key: 'market', target: ['nav-kabarPasar', 'mobile-feature-kabarPasar', 'nav-lainnya'], placement: 'right' },
    { key: 'encyclopedia', target: 'nav-ensiklopedia', placement: 'right' },
    { key: 'calendar', target: 'nav-kalender', placement: 'right' },
    { key: 'profile', target: ['profile-menu', 'mobile-profile-settings'], placement: 'top' },
  ],
};

export const PAGE_GUIDES: GuideDefinition[] = [
  {
    id: 'finance',
    messageKey: 'pages.finance',
    route: '/dashboard/keuangan',
    steps: [
      { key: 'overview', target: 'finance-ledger', placement: 'right' },
      { key: 'record', target: ['finance-add-transaction', 'finance-add-transaction-mobile', 'finance-add-transaction-empty'], placement: 'bottom' },
      { key: 'export', target: 'finance-export', placement: 'bottom' },
      { key: 'report', target: 'finance-report', placement: 'left' },
    ],
  },
  {
    id: 'stock',
    messageKey: 'pages.stock',
    route: '/dashboard/stok',
    steps: [
      { key: 'overview', target: 'stock-summary', placement: 'bottom' },
      { key: 'batch', target: 'stock-add-batch', placement: 'bottom' },
      { key: 'mutation', target: ['stock-stock-out', 'stock-tabs'], placement: 'bottom' },
    ],
  },
  {
    id: 'weather',
    messageKey: 'pages.weather',
    route: '/dashboard/cuaca',
    steps: [
      { key: 'overview', target: 'weather-current', placement: 'right' },
      { key: 'location', target: 'weather-gps', placement: 'bottom' },
      { key: 'notification', target: 'weather-notifications', placement: 'left' },
    ],
  },
  {
    id: 'market',
    messageKey: 'pages.market',
    route: '/dashboard/kabar-pasar',
    steps: [
      { key: 'overview', target: 'market-price-chart', placement: 'left' },
      { key: 'categories', target: 'market-categories', placement: 'bottom' },
      { key: 'prices', target: 'market-refresh', placement: 'bottom' },
    ],
  },
  {
    id: 'encyclopedia',
    messageKey: 'pages.encyclopedia',
    route: '/dashboard/ensiklopedia',
    steps: [
      { key: 'overview', target: 'ai-chat-input', placement: 'top' },
      { key: 'ask', target: 'ai-quick-prompts', placement: 'bottom' },
      { key: 'reference', target: 'ai-quick-reference', placement: 'bottom' },
    ],
  },
  {
    id: 'calendar',
    messageKey: 'pages.calendar',
    route: '/dashboard/kalender',
    steps: [
      { key: 'overview', target: 'calendar-grid', placement: 'right' },
      { key: 'schedule', target: 'calendar-add-schedule', placement: 'bottom' },
      { key: 'reminder', target: 'calendar-upcoming', placement: 'left' },
    ],
  },
  {
    id: 'settings',
    messageKey: 'pages.settings',
    route: '/dashboard/pengaturan',
    steps: [
      { key: 'overview', target: 'settings-tabs', placement: 'right' },
      { key: 'profile', target: ['settings-profile-save', 'settings-tab-profil'], placement: 'top' },
      { key: 'preferences', target: 'settings-theme-toggle', placement: 'bottom' },
    ],
  },
];

const GUIDE_DEFINITIONS = [GLOBAL_GUIDE, ...PAGE_GUIDES];

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function getGuideStorageKey(guideId: GuideId) {
  return `arina-guide:${GUIDE_STORAGE_VERSION}:${guideId}`;
}

export function getGuideDefinition(guideId: GuideId) {
  return GUIDE_DEFINITIONS.find((guide) => guide.id === guideId) ?? null;
}

export function getGuideForPathname(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    PAGE_GUIDES.find((guide) => {
      if (!guide.route) return false;
      return normalizedPathname === guide.route || normalizedPathname.startsWith(`${guide.route}/`);
    }) ?? null
  );
}

export function isGuideSeen(storage: GuideStorage, guideId: GuideId) {
  try {
    return storage.getItem(getGuideStorageKey(guideId)) === 'true';
  } catch {
    return false;
  }
}

export function markGuideSeen(storage: GuideStorage, guideId: GuideId) {
  try {
    storage.setItem(getGuideStorageKey(guideId), 'true');
  } catch {
    // Ignore storage errors so the guide never blocks dashboard usage.
  }
}
