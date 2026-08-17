import { expect, test } from '@playwright/test';

const localDemoUserId = '00000000-0000-4000-8000-000000000001';

const mobileViewports = [
  { height: 568, name: '320x568', width: 320 },
  { height: 844, name: '390x844', width: 390 },
];

test.describe('reusable UI foundation RAB mobile smoke', () => {
  for (const viewport of mobileViewports) {
    test(`RAB has no document overflow at ${viewport.name}`, async ({ browserName, page }) => {
      test.skip(browserName !== 'chromium', 'This is a Chromium mobile viewport smoke.');

      await page.addInitScript((userId) => {
        localStorage.setItem('arina_auth_mode', 'local');
        localStorage.setItem('arina_local_user_id', userId);
        localStorage.setItem('arina_user_id', userId);
        localStorage.setItem('arina-guide:v1:finance', 'true');
      }, localDemoUserId);
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/keuangan', { waitUntil: 'domcontentloaded' });

      const rabTab = page.getByRole('tab', { name: 'RAB', exact: true });
      await expect(rabTab).toBeVisible();
      await page.waitForTimeout(750);
      await rabTab.click();
      await expect(rabTab).toHaveAttribute('aria-selected', 'true');
      const rabPanel = page.getByTestId('finance-panel-rab');
      await expect(rabPanel).toBeVisible();

      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const rabMobileItemOrEmptyState = rabPanel
        .getByRole('article', { name: /^Item RAB / })
        .or(rabPanel.getByText('Belum ada proyek'))
        .or(rabPanel.getByText('Belum ada item RAB.'));
      await expect(rabMobileItemOrEmptyState).toBeVisible();
    });
  }
});
