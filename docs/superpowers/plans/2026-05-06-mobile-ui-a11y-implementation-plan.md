# Mobile UI, A11y, and Tokenization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement consistent mobile navigation (top app bar + 5-item bottom nav), add a Stok quick action, achieve WCAG AA a11y fixes, and replace hardcoded colors with theme tokens across all pages.

**Architecture:** Add a shared mobile top app bar rendered by the dashboard layout, keep Settings as a modal opened via query params, and unify color usage via MUI theme tokens plus CSS variables for gradients. Use Vitest + RTL for lightweight UI checks and CSS/token presence tests.

**Tech Stack:** Next.js 16 (App Router), React 19, MUI v9, next-intl, TypeScript, Vitest, @testing-library/react

---

## File Structure (Create/Modify)

**Create**
- `components/shared/MobileTopAppBar.tsx` — mobile-only app bar with page title + settings action.
- `components/dashboard/QuickActions.tsx` — dashboard quick action card for Stok.
- `vitest.config.ts` — test runner config (jsdom + RTL).
- `tests/setup.ts` — jest-dom setup.
- `tests/smoke.test.ts` — smoke test for test runner.
- `tests/components/MobileTopAppBar.test.tsx` — verify title + settings button.
- `tests/components/MobileBottomNav.test.tsx` — verify 5 items, no Settings.
- `tests/components/QuickActions.test.tsx` — verify Stok CTA link.
- `tests/theme/theme.test.ts` — verify palette tokens exist.
- `tests/styles/globals.test.ts` — verify reduced-motion CSS and gradient vars.
- `tests/a11y/icon-buttons.test.ts` — verify aria-labels are present in key files.

**Modify**
- `package.json` — add test script + devDependencies.
- `app/dashboard/layout.tsx` — render `MobileTopAppBar` and adjust main padding.
- `components/shared/MobileBottomNav.tsx` — remove Settings item + label sizing.
- `app/dashboard/page.tsx` — render `QuickActions`, update KPI colors to use palette keys.
- `components/dashboard/KPICard.tsx` — accept palette keys and use theme tokens.
- `components/shared/Sidebar.tsx` — add aria-labels + replace hex colors with theme tokens.
- `components/shared/SettingsModal.tsx` — add aria-labels + replace hex colors with theme tokens.
- `components/dashboard/WeatherBanner.tsx` — tokenized colors.
- `components/dashboard/RecentTransactionsTable.tsx` — tokenized hover/border/chip colors.
- `components/dashboard/DashboardCharts.tsx` — tokenized legend + no-data state.
- `app/dashboard/cuaca/page.tsx` — gradient tokens + tokenized colors + aria-labels for icon-only buttons.
- `app/dashboard/ensiklopedia/page.tsx` — tokenized colors + aria-labels for icon-only buttons.
- `app/dashboard/kalender/page.tsx` — tokenized colors + aria-labels for icon-only buttons.
- `app/dashboard/stok/page.tsx` — tokenized status/grade chips + aria-labels for icon-only buttons.
- `app/not-found.tsx` — tokenized colors.
- `lib/theme.ts` — add palette tokens for success/warning/error/info/action.
- `app/globals.css` — add reduced-motion overrides + gradient CSS variables.

---

### Task 1: Add Vitest + RTL test tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Add test script + devDependencies**

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: packages installed, no errors.

- [ ] **Step 3: Add Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 4: Add RTL setup file**

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write failing smoke test**

```ts
// tests/smoke.test.ts
import { test, expect } from 'vitest';

test('smoke test runner', () => {
  expect(1).toBe(2);
});
```

- [ ] **Step 6: Run tests to verify failure**

Run: `npm run test`
Expected: FAIL with `Expected: 2, Received: 1`.

- [ ] **Step 7: Fix smoke test**

```ts
// tests/smoke.test.ts
import { test, expect } from 'vitest';

test('smoke test runner', () => {
  expect(1).toBe(1);
});
```

- [ ] **Step 8: Run tests to verify pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json vitest.config.ts tests/setup.ts tests/smoke.test.ts
git commit -m "test: add vitest and rtl setup"
```

---

### Task 2: Add MobileTopAppBar and integrate into dashboard layout

**Files:**
- Create: `components/shared/MobileTopAppBar.tsx`
- Modify: `app/dashboard/layout.tsx`
- Test: `tests/components/MobileTopAppBar.test.tsx`

- [ ] **Step 1: Write failing test for MobileTopAppBar**

```tsx
// tests/components/MobileTopAppBar.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileTopAppBar from '@/components/shared/MobileTopAppBar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/keuangan',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MobileTopAppBar', () => {
  it('renders title and settings button', () => {
    render(<MobileTopAppBar />);
    expect(screen.getByText('keuangan')).toBeInTheDocument();
    expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm run test -- MobileTopAppBar`
Expected: FAIL (module not found: MobileTopAppBar).

- [ ] **Step 3: Implement MobileTopAppBar**

```tsx
// components/shared/MobileTopAppBar.tsx
'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';

const titleMap: Array<{ prefix: string; key: string }> = [
  { prefix: '/dashboard/keuangan', key: 'keuangan' },
  { prefix: '/dashboard/cuaca', key: 'cuaca' },
  { prefix: '/dashboard/ensiklopedia', key: 'ensiklopedia' },
  { prefix: '/dashboard/kalender', key: 'kalender' },
  { prefix: '/dashboard/stok', key: 'stok' },
  { prefix: '/dashboard', key: 'dashboard' },
];

export default function MobileTopAppBar() {
  const t = useTranslations('MobileNav');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const titleKey = titleMap.find((item) => pathname.startsWith(item.prefix))?.key ?? 'dashboard';

  const handleOpenSettings = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('settings', 'true');
    params.set('tab', 'general');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        display: { xs: 'block', md: 'none' },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 56, px: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t(titleKey)}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton aria-label="Open settings" onClick={handleOpenSettings} size="small">
          <SettingsOutlinedIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
```

- [ ] **Step 4: Wire MobileTopAppBar into dashboard layout**

```tsx
// app/dashboard/layout.tsx
import MobileTopAppBar from '@/components/shared/MobileTopAppBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'flex' }, minHeight: '100dvh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: 'auto' },
          pb: { xs: 'calc(84px + env(safe-area-inset-bottom))', md: 0 },
          minHeight: '100dvh',
          backgroundColor: 'background.default',
          overflowX: 'hidden',
        }}
      >
        <MobileTopAppBar />
        {children}
      </Box>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>
    </Box>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test -- MobileTopAppBar`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/shared/MobileTopAppBar.tsx app/dashboard/layout.tsx tests/components/MobileTopAppBar.test.tsx
git commit -m "feat: add mobile top app bar with settings"
```

---

### Task 3: Update MobileBottomNav to 5 items

**Files:**
- Modify: `components/shared/MobileBottomNav.tsx`
- Test: `tests/components/MobileBottomNav.test.tsx`

- [ ] **Step 1: Write failing test for bottom nav items**

```tsx
// tests/components/MobileBottomNav.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MobileBottomNav', () => {
  it('shows 5 items and no settings', () => {
    render(<MobileBottomNav />);
    const actions = screen.getAllByRole('button');
    expect(actions.length).toBe(5);
    expect(screen.queryByText('pengaturan')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm run test -- MobileBottomNav`
Expected: FAIL (6 items found).

- [ ] **Step 3: Update MobileBottomNav config and styles**

```tsx
// components/shared/MobileBottomNav.tsx
const mobileNavItems: MobileNavItem[] = [
  { key: 'dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { key: 'keuangan', icon: <AccountBalanceWalletIcon />, path: '/dashboard/keuangan' },
  { key: 'cuaca', icon: <CloudIcon />, path: '/dashboard/cuaca' },
  { key: 'ensiklopedia', icon: <AutoStoriesIcon />, path: '/dashboard/ensiklopedia' },
  { key: 'kalender', icon: <CalendarMonthIcon />, path: '/dashboard/kalender' },
];

<BottomNavigation
  aria-label="Primary"
  value={currentValue === -1 ? 0 : currentValue}
  onChange={(_, newValue) => {
    const item = mobileNavItems[newValue];
    if (pathname !== item.path) {
      router.push(item.path);
    }
  }}
  sx={{ height: 64, px: 0.5 }}
>
  {mobileNavItems.map((item) => (
    <BottomNavigationAction
      key={item.path}
      label={t(item.key)}
      icon={item.icon}
      sx={{
        '&.Mui-selected': { color: 'primary.main' },
        fontSize: '0.7rem',
      }}
    />
  ))}
</BottomNavigation>
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- MobileBottomNav`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/shared/MobileBottomNav.tsx tests/components/MobileBottomNav.test.tsx
git commit -m "feat: simplify bottom nav to five items"
```

---

### Task 4: Add Stok quick action card on Dashboard

**Files:**
- Create: `components/dashboard/QuickActions.tsx`
- Modify: `app/dashboard/page.tsx`
- Test: `tests/components/QuickActions.test.tsx`

- [ ] **Step 1: Write failing test for QuickActions**

```tsx
// tests/components/QuickActions.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuickActions from '@/components/dashboard/QuickActions';

describe('QuickActions', () => {
  it('renders Buka Stok link', () => {
    render(<QuickActions />);
    const link = screen.getByRole('link', { name: /buka stok/i });
    expect(link).toHaveAttribute('href', '/dashboard/stok');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- QuickActions`
Expected: FAIL (module not found: QuickActions).

- [ ] **Step 3: Implement QuickActions component**

```tsx
// components/dashboard/QuickActions.tsx
'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from 'next/link';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';

export default function QuickActions() {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: 'success.light',
            color: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <InventoryOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Manajemen Stok Panen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pantau stok dan batch panen terbaru.
          </Typography>
        </Box>
        <Button component={Link} href="/dashboard/stok" variant="contained">
          Buka Stok
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Add QuickActions to dashboard page**

```tsx
// app/dashboard/page.tsx
import QuickActions from '@/components/dashboard/QuickActions';

// After WeatherBanner
<Box sx={{ mb: 3 }}>
  <QuickActions />
</Box>
```

- [ ] **Step 5: Run test to verify pass**

Run: `npm run test -- QuickActions`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/QuickActions.tsx app/dashboard/page.tsx tests/components/QuickActions.test.tsx
git commit -m "feat: add stok quick action on dashboard"
```

---

### Task 5: Add theme tokens + reduced motion CSS

**Files:**
- Modify: `lib/theme.ts`
- Modify: `app/globals.css`
- Test: `tests/theme/theme.test.ts`
- Test: `tests/styles/globals.test.ts`

- [ ] **Step 1: Write failing tests for theme tokens and reduced-motion CSS**

```ts
// tests/theme/theme.test.ts
import { test, expect } from 'vitest';
import theme from '@/lib/theme';

test('theme has status palette tokens', () => {
  expect(theme.palette.success.main).toBe('#16a34a');
  expect(theme.palette.warning.main).toBe('#f59e0b');
  expect(theme.palette.error.main).toBe('#dc2626');
  expect(theme.palette.info.main).toBe('#2563eb');
});
```

```ts
// tests/styles/globals.test.ts
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('app/globals.css', 'utf8');

test('globals includes reduced-motion override', () => {
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
});

test('globals include weather gradient tokens', () => {
  expect(css).toContain('--weather-sunny-start');
  expect(css).toContain('--weather-cloudy-start');
  expect(css).toContain('--weather-rainy-start');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- theme` and `npm run test -- globals`
Expected: FAIL (tokens not found).

- [ ] **Step 3: Add palette tokens in theme**

```ts
// lib/theme.ts
const baseTheme = createTheme({
  palette: {
    primary: {
      main: '#16a34a',
      dark: '#15803d',
      light: '#dcfce7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',
      light: '#dcfce7',
      dark: '#15803d',
    },
    warning: {
      main: '#f59e0b',
      light: '#fef3c7',
      dark: '#b45309',
    },
    error: {
      main: '#dc2626',
      light: '#fee2e2',
      dark: '#991b1b',
    },
    info: {
      main: '#2563eb',
      light: '#dbeafe',
      dark: '#1e40af',
    },
    action: {
      hover: 'rgba(15, 23, 42, 0.04)',
      selected: 'rgba(22, 163, 74, 0.08)',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
});
```

- [ ] **Step 4: Add gradient tokens + reduced-motion CSS**

```css
:root {
  --weather-sunny-start: #7c2d12;
  --weather-sunny-mid: #c2410c;
  --weather-sunny-end: #f59e0b;
  --weather-cloudy-start: #334155;
  --weather-cloudy-mid: #475569;
  --weather-cloudy-end: #94a3b8;
  --weather-rainy-start: #1e3a5f;
  --weather-rainy-mid: #1d4ed8;
  --weather-rainy-end: #2563eb;
}

@media (prefers-reduced-motion: reduce) {
  .weather-rain-drop,
  .weather-sun-ring,
  .weather-sun-core,
  .weather-cloud {
    animation: none !important;
  }
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test -- theme` and `npm run test -- globals`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts app/globals.css tests/theme/theme.test.ts tests/styles/globals.test.ts
git commit -m "feat: add theme tokens and reduced-motion css"
```

---

### Task 6: Tokenize shared components + add aria-labels

**Files:**
- Modify: `components/shared/Sidebar.tsx`
- Modify: `components/shared/SettingsModal.tsx`
- Test: `tests/a11y/icon-buttons.test.ts`

- [ ] **Step 1: Write failing aria-label test**

```ts
// tests/a11y/icon-buttons.test.ts
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('components/shared/Sidebar.tsx', 'utf8');
const settings = readFileSync('components/shared/SettingsModal.tsx', 'utf8');

test('sidebar icon buttons have aria-labels', () => {
  expect(sidebar).toContain('aria-label="Toggle sidebar"');
});

test('settings modal close button has aria-label', () => {
  expect(settings).toContain('aria-label="Close settings"');
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- icon-buttons`
Expected: FAIL (aria-labels missing).

- [ ] **Step 3: Update Sidebar tokens + aria-labels**

```tsx
// components/shared/Sidebar.tsx
<Drawer
  sx={{
    '& .MuiDrawer-paper': {
      borderRight: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
    },
  }}
>
  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800 }}>
    Arina Agri
  </Typography>
  <IconButton aria-label="Toggle sidebar" size="small" onClick={handleToggleSidebar} sx={{ color: 'text.secondary' }}>
    <ViewSidebarIcon />
  </IconButton>

  <ListItemButton
    sx={{
      bgcolor: active ? 'success.light' : 'transparent',
      '&:hover': { bgcolor: active ? 'success.light' : 'action.hover' },
    }}
  >
    <ListItemIcon sx={{ color: active ? 'primary.dark' : 'text.secondary' }}>
      {item.icon}
    </ListItemIcon>
    <ListItemText
      slotProps={{
        primary: {
          sx: {
            color: active ? 'primary.main' : 'text.secondary',
          },
        },
      }}
    />
  </ListItemButton>
```

- [ ] **Step 4: Update SettingsModal tokens + aria-labels**

```tsx
// components/shared/SettingsModal.tsx
<IconButton
  aria-label="Close settings"
  onClick={handleClose}
  size="small"
  sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
>
  <CloseIcon fontSize="small" />
</IconButton>

// Example token replacements in SettingsModal
<Box sx={{ bgcolor: 'background.default', borderColor: 'divider' }}>
  <ListItemButton
    sx={{
      bgcolor: activeTab === tab.id ? 'success.light' : 'transparent',
      color: activeTab === tab.id ? 'success.dark' : 'text.secondary',
    }}
  />
</Box>
```

- [ ] **Step 5: Run aria-label test to verify pass**

Run: `npm run test -- icon-buttons`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/shared/Sidebar.tsx components/shared/SettingsModal.tsx tests/a11y/icon-buttons.test.ts
git commit -m "fix: tokenized shared components and add aria labels"
```

---

### Task 7: Tokenize dashboard core components

**Files:**
- Modify: `components/dashboard/KPICard.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `components/dashboard/WeatherBanner.tsx`
- Modify: `components/dashboard/RecentTransactionsTable.tsx`
- Modify: `components/dashboard/DashboardCharts.tsx`

- [ ] **Step 1: Update KPI card to use palette keys**

```tsx
// components/dashboard/KPICard.tsx
import { useTheme, alpha } from '@mui/material/styles';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color?: 'success' | 'warning' | 'error' | 'info';
  trend?: { value: string; positive: boolean };
}

export default function KPICard({ title, value, subtitle, icon, color = 'success', trend }: KPICardProps) {
  const theme = useTheme();
  const palette = theme.palette[color];

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: palette.main,
          opacity: 0.06,
        }}
      />
      <CardContent sx={{ p: 2.5 }}>
        <Box className="flex items-start justify-between">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontFamily: 'var(--font-sora)', color: 'text.primary', lineHeight: 1.2, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Typography variant="caption" sx={{ color: trend.positive ? 'success.main' : 'error.main', fontWeight: 600, mt: 0.5, display: 'block' }}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              backgroundColor: alpha(palette.main, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              color: palette.main,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update dashboard page KPI colors**

```tsx
// app/dashboard/page.tsx
<KPICard
  title={t('kpi.totalExpense.title')}
  value={formatRupiah(totalPengeluaran)}
  subtitle={`${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}`}
  icon={<AccountBalanceWalletIcon />}
  color="error"
  trend={{ value: `${expTrend > 0 ? '+' : ''}${expTrend}% dari bulan lalu`, positive: expTrend <= 0 }}
/>

<KPICard
  title={t('kpi.netProfit.title')}
  value={formatRupiah(labaBersih)}
  subtitle="Pendapatan - Pengeluaran"
  icon={<TrendingUpIcon />}
  color="success"
  trend={{ value: `${profitTrend > 0 ? '+' : ''}${profitTrend}% dari bulan lalu`, positive: profitTrend >= 0 }}
/>

<KPICard
  title={t('kpi.harvest.title')}
  value={t('kpi.harvest.value', { days: harvestInfo.days })}
  subtitle={harvestInfo.subtitle}
  icon={<AgricultureIcon />}
  color="success"
/>

<KPICard
  title={t('kpi.weather.title')}
  value={t('kpi.weather.value')}
  subtitle={t('kpi.weather.subtitle')}
  icon={<WbCloudyIcon />}
  color="warning"
/>
```

- [ ] **Step 3: Tokenize WeatherBanner colors**

```tsx
// components/dashboard/WeatherBanner.tsx
import { alpha } from '@mui/material/styles';

<Alert
  severity="warning"
  icon={<WarningAmberIcon />}
  sx={{
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'warning.light',
    backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.08),
    '& .MuiAlert-icon': { color: 'warning.main' },
  }}
>
  <AlertTitle sx={{ fontWeight: 600, color: 'warning.dark' }}>{t('title')}</AlertTitle>
  <Typography variant="body2" color="warning.dark">
    {message || defaultMessage}
  </Typography>
</Alert>
```

- [ ] **Step 4: Tokenize RecentTransactionsTable**

```tsx
// components/dashboard/RecentTransactionsTable.tsx
<TableRow
  sx={{
    '&:hover': { backgroundColor: 'action.hover' },
    '& td': { borderColor: 'divider', fontSize: '0.875rem' },
  }}
>
  ...
  <Chip
    label={tx.jenis === 'pendapatan' ? t('type.income') : t('type.expense')}
    size="small"
    sx={{
      backgroundColor: tx.jenis === 'pendapatan' ? 'success.light' : 'error.light',
      color: tx.jenis === 'pendapatan' ? 'success.main' : 'error.main',
      fontWeight: 600,
      fontSize: '0.7rem',
    }}
  />
</TableRow>
```

- [ ] **Step 5: Tokenize DashboardCharts no-data state**

```tsx
// components/dashboard/DashboardCharts.tsx
<Box
  sx={{
    height: 260,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'action.hover',
    borderRadius: 2,
    border: '1px dashed',
    borderColor: 'divider',
  }}
>
  <Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography>
</Box>
```

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/KPICard.tsx app/dashboard/page.tsx components/dashboard/WeatherBanner.tsx components/dashboard/RecentTransactionsTable.tsx components/dashboard/DashboardCharts.tsx
git commit -m "refactor: tokenized dashboard core components"
```

---

### Task 8: Tokenize dashboard subpages + add aria-labels

**Files:**
- Modify: `app/dashboard/cuaca/page.tsx`
- Modify: `app/dashboard/ensiklopedia/page.tsx`
- Modify: `app/dashboard/kalender/page.tsx`
- Modify: `app/dashboard/stok/page.tsx`
- Modify: `app/not-found.tsx`

- [ ] **Step 1: Cuaca gradients use CSS variables + tokenized icons**

```tsx
// app/dashboard/cuaca/page.tsx
const currentWeatherCardBackground =
  currentCondition === 'cerah'
    ? 'linear-gradient(135deg, var(--weather-sunny-start) 0%, var(--weather-sunny-mid) 45%, var(--weather-sunny-end) 100%)'
    : currentCondition === 'berawan' || currentCondition === 'mendung'
      ? 'linear-gradient(135deg, var(--weather-cloudy-start) 0%, var(--weather-cloudy-mid) 55%, var(--weather-cloudy-end) 100%)'
      : 'linear-gradient(135deg, var(--weather-rainy-start) 0%, var(--weather-rainy-mid) 60%, var(--weather-rainy-end) 100%)';

// Add aria-labels for any icon-only IconButton usage in the file
```

- [ ] **Step 2: Ensiklopedia tokenized colors + aria-labels**

```tsx
// app/dashboard/ensiklopedia/page.tsx
<IconButton
  aria-label="Clear chat history"
  onClick={handleClearChat}
  size="small"
  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'error.light' } }}
>
  <DeleteOutlinedIcon fontSize="small" />
</IconButton>

// Replace hardcoded colors
<Box sx={{ bgcolor: 'success.main', boxShadow: (theme) => `0 4px 12px ${theme.palette.success.main}33` }}>
  <AutoAwesomeIcon sx={{ color: '#fff' }} />
</Box>
```

- [ ] **Step 3: Kalender tokenized jenisColors + aria-labels**

```tsx
// app/dashboard/kalender/page.tsx
import { alpha, useTheme } from '@mui/material/styles';

const theme = useTheme();
const jenisColors = {
  pemupukan: { bg: alpha(theme.palette.success.main, 0.12), text: theme.palette.success.main, dot: theme.palette.success.main },
  penyemprotan: { bg: alpha(theme.palette.error.main, 0.12), text: theme.palette.error.main, dot: theme.palette.error.main },
  irigasi: { bg: alpha(theme.palette.info.main, 0.12), text: theme.palette.info.main, dot: theme.palette.info.main },
  pemetikan: { bg: alpha(theme.palette.warning.main, 0.12), text: theme.palette.warning.dark, dot: theme.palette.warning.main },
  lainnya: { bg: alpha(theme.palette.grey[500], 0.12), text: theme.palette.text.secondary, dot: theme.palette.grey[500] },
};

<IconButton aria-label="Previous month" size="small" onClick={() => setCurrentDate(new Date(year, month - 1))}>
  <ChevronLeftIcon />
</IconButton>
<IconButton aria-label="Next month" size="small" onClick={() => setCurrentDate(new Date(year, month + 1))}>
  <ChevronRightIcon />
</IconButton>
```

- [ ] **Step 4: Stok tokenized chips + aria-labels**

```tsx
// app/dashboard/stok/page.tsx
import { alpha, useTheme } from '@mui/material/styles';

const theme = useTheme();
const StatusChip = ({ status }: { status: ApiHarvestBatch['status'] }) => {
  const map = {
    aman: { label: 'Aman', color: alpha(theme.palette.success.main, 0.12), text: theme.palette.success.main },
    menipis: { label: 'Menipis', color: alpha(theme.palette.warning.main, 0.12), text: theme.palette.warning.dark },
    hampir_kadaluarsa: { label: 'Hampir Kadaluarsa', color: alpha(theme.palette.error.main, 0.12), text: theme.palette.error.main },
    habis: { label: 'Habis', color: alpha(theme.palette.grey[500], 0.12), text: theme.palette.text.secondary },
  };
  const s = map[status];
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.color, color: s.text, fontWeight: 700, fontSize: '0.7rem', borderRadius: 1.5 }} />;
};

<IconButton aria-label="Edit batch" size="small">
  <EditIcon fontSize="small" />
</IconButton>
<IconButton aria-label="Delete batch" size="small">
  <DeleteIcon fontSize="small" />
</IconButton>
```

- [ ] **Step 5: Not Found tokenized colors**

```tsx
// app/not-found.tsx
<Typography
  variant="h5"
  sx={{ mt: 2, mb: 1.5, color: 'success.dark', fontFamily: 'var(--font-sora)', fontWeight: 700 }}
>
  {t('title')}
</Typography>
<Typography variant="body1" sx={{ color: 'text.secondary', mb: 5, maxWidth: 400, mx: 'auto', lineHeight: 1.6 }}>
  {t('description')}
</Typography>
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/cuaca/page.tsx app/dashboard/ensiklopedia/page.tsx app/dashboard/kalender/page.tsx app/dashboard/stok/page.tsx app/not-found.tsx
git commit -m "refactor: tokenize dashboard subpages and add aria labels"
```

---

## Self-Review
- **Spec coverage:**
  - Mobile top app bar + settings access: Task 2
  - Bottom nav reduced to 5 items: Task 3
  - Stok quick action: Task 4
  - WCAG AA: Tasks 5–8 (contrast/tokenization + aria-labels + reduced motion)
  - Hardcoded colors → tokens: Tasks 5–8

- **Placeholder scan:** No TODO/TBD or “similar to” instructions remain.
- **Type consistency:** Palette keys are limited to `success | warning | error | info` and used consistently across KPI + status chips.

---

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-05-06-mobile-ui-a11y-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
