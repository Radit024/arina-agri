# Mobile UI, A11y, and Theme Tokenization Design

Date: 2026-05-06
Status: Approved (user)
Owner: Copilot + Arina Agri team

## Summary
Refine mobile UI across all pages, enforce WCAG AA accessibility, consolidate colors into theme tokens, and simplify mobile navigation. Bottom nav is capped at 5 items with Settings moved to a consistent top app bar on all dashboard pages. Stok is accessed via a quick action card on the dashboard.

## Goals
- Deliver a clean mobile structure across all pages.
- Meet WCAG AA contrast and a11y expectations for key UI elements.
- Reduce hardcoded colors by using theme tokens and CSS variables.
- Improve navigation clarity with a 5-item bottom nav and a consistent mobile top app bar.

## Non-Goals
- No backend changes or data model changes.
- No new feature expansion beyond navigation and UI refinements.
- No full dark mode implementation (only token readiness).

## Scope
- All pages in the app, including dashboard subpages and auth pages.
- Shared components that define navigation, layout, and common UI patterns.

## Key Decisions
- Bottom nav items: Dashboard, Keuangan, Cuaca, Ensiklopedia, Kalender.
- Settings access: gear icon on a consistent mobile top app bar for all dashboard pages.
- Stok access on mobile: quick action card on Dashboard page.
- Accessibility target: WCAG AA.

## UX and Navigation Changes
### Mobile Top App Bar (Dashboard)
- A new shared mobile-only top app bar renders on all dashboard pages.
- Contains page title and a Settings gear icon.
- Settings gear opens existing Settings modal via the query param pattern: `?settings=true&tab=general`.
- The app bar is sticky and respects safe areas.
- Main content gains top padding on mobile to avoid overlap.

### Bottom Navigation
- Reduce to 5 items; remove Settings item from bottom nav.
- Keep labels and icons; increase label size for legibility.
- Keep selected state styling consistent with theme tokens.

### Stok Access
- Add a quick action card on Dashboard page with a clear CTA to open Stok.
- Card appears near other high-priority actions on mobile (above charts or within KPI area).

## Accessibility and Contrast (WCAG AA)
### A11y Enhancements
- Add `aria-label` to icon-only buttons (sidebar toggle, settings gear, dialog close, delete, etc.).
- Ensure focus-visible styles are present and not removed.
- Avoid hover-only affordances; ensure clickable controls are obvious on touch.
- Ensure keyboard navigation still works for all dialog and menu controls.

### Contrast Fixes
- Increase contrast for small text and subtle labels (table headers, bottom nav labels, captions).
- Avoid light gray on gray for text, borders, and disabled states.
- Use theme palette tokens for status colors to keep contrast consistent.

### Motion
- Respect `prefers-reduced-motion` by disabling or reducing weather animations.

## Theme Tokenization Plan
### Theme Tokens
- Extend theme palette to include explicit success, warning, error, info scales.
- Use `palette.text`, `palette.background`, `palette.divider`, and `palette.action` instead of hardcoded hex values.
- For tinted backgrounds, prefer `alpha(palette.*.main, opacity)` or `palette.*.light`.

### Replace Hardcoded Colors
Focus first on UI surfaces and repeated components:
- Sidebar, MobileBottomNav, SettingsModal
- KPI cards, Weather banner, Dashboard charts, Transactions table
- Auth pages (backgrounds, highlights, CTA buttons)

## Component/Files to Update (Expected)
- `components/shared/MobileBottomNav.tsx` (items, labels, sizing)
- `components/shared/Sidebar.tsx` (aria-labels, token colors)
- `components/shared/SettingsModal.tsx` (aria-labels, token colors)
- `components/shared/MuiProvider.tsx` + `lib/theme.ts` (theme tokens)
- `app/dashboard/layout.tsx` (mobile top app bar, padding adjustments)
- `app/dashboard/page.tsx` (quick action card for Stok)
- `app/globals.css` (reduced motion styles for weather animations)
- Additional pages with hardcoded colors for final pass (auth + dashboard subpages)

## Data Flow and State
- Settings open state stays query-param driven (`settings=true`), no new state store.
- Mobile top app bar reads route via `usePathname` and maps to title keys.
- Quick action card uses normal routing (link to `/dashboard/stok`).

## Error Handling
- No new error states introduced.
- Ensure UI remains stable if Settings is opened from any page.

## Performance Considerations
- Keep mobile top app bar lightweight (simple MUI components).
- Avoid new heavy imports on every page.
- Ensure animations honor reduced-motion to avoid unnecessary GPU work.

## QA / Testing Checklist
- Mobile nav shows 5 items and labels are readable.
- Settings modal opens from top app bar gear on all dashboard pages.
- Stok is reachable via quick action on Dashboard.
- Icon-only buttons have aria-labels and are keyboard-focusable.
- Contrast passes WCAG AA for primary text and small labels.
- Reduced-motion preference stops weather animations.

## Rollout
- Ship as a UI-only change set.
- Manual QA on 375px and tablet breakpoints.

## Open Questions
- None. All choices were confirmed by the user.
