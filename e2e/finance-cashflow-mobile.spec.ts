import { expect, test } from '@playwright/test';

const localDemoUserId = '00000000-0000-4000-8000-000000000002';
const localDemoProjectId = 'e2e-cashflow-mobile-project';

const mobileViewports = [
  { height: 568, name: '320x568', width: 320 },
  { height: 844, name: '390x844', width: 390 },
];

test.describe('regular cashflow mobile reports', () => {
  for (const viewport of mobileViewports) {
    test(`shows populated, expandable cashflow cards at ${viewport.name}`, async ({ browserName, page }) => {
      test.skip(browserName !== 'chromium', 'This is a Chromium mobile viewport smoke.');

      await page.addInitScript(({ projectId, userId }) => {
        const scenarioId = `guest-proj-${projectId}`;
        const createdAt = '2026-01-01T00:00:00.000Z';
        const projects = [
          {
            id: projectId,
            name: 'Proyek Arus Kas E2E',
            commodity: 'Padi',
            landArea: 1,
            landAreaUnit: 'ha',
            seasonLabel: 'MT 2026',
            startDate: '2026-01-01',
            endDate: '2026-02-28',
            status: 'active',
            createdAt,
            updatedAt: createdAt,
          },
        ];
        const transactions = [
          {
            _id: 'e2e-cashflow-income-january',
            jenis: 'pendapatan',
            kategori: 'Penjualan',
            nominal: 5000000,
            tanggal: '2026-01-15',
            keterangan: 'Penjualan gabah Januari',
            projectId,
            scenarioId,
            createdAt,
            updatedAt: createdAt,
          },
          {
            _id: 'e2e-cashflow-expense-january',
            jenis: 'pengeluaran',
            kategori: 'Benih',
            nominal: 1200000,
            tanggal: '2026-01-20',
            keterangan: 'Pembelian benih Januari',
            projectId,
            scenarioId,
            createdAt,
            updatedAt: createdAt,
          },
          {
            _id: 'e2e-cashflow-income-february',
            jenis: 'pendapatan',
            kategori: 'Penjualan',
            nominal: 3400000,
            tanggal: '2026-02-12',
            keterangan: 'Penjualan gabah Februari',
            projectId,
            scenarioId,
            createdAt,
            updatedAt: createdAt,
          },
          {
            _id: 'e2e-cashflow-expense-february',
            jenis: 'pengeluaran',
            kategori: 'Pupuk',
            nominal: 900000,
            tanggal: '2026-02-18',
            keterangan: 'Pembelian pupuk Februari',
            projectId,
            scenarioId,
            createdAt,
            updatedAt: createdAt,
          },
        ];

        // Playwright creates a fresh context per test; clear only this page's
        // origin storage before setting every value the hooks can hydrate from.
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('arina_auth_mode', 'local');
        localStorage.setItem('arina_local_user_id', userId);
        localStorage.setItem('arina_user_id', userId);
        localStorage.setItem('arina-guide:v1:finance', 'true');
        localStorage.setItem('arina-selected-finance-project', JSON.stringify(projectId));
        localStorage.setItem(`arina-finance-scenario-mode-${projectId}`, JSON.stringify('PROJECTION'));

        // useFinanceProjects first renders as guest before AuthContext resolves
        // the local user, so both storage keys must hold the selected project.
        localStorage.setItem('arina-finance-projects-guest', JSON.stringify(projects));
        localStorage.setItem(`arina-finance-projects-${userId}`, JSON.stringify(projects));
        sessionStorage.setItem(
          'arina-finance-projects-guest',
          JSON.stringify(projects),
        );
        sessionStorage.setItem(
          `arina-finance-projects-${userId}`,
          JSON.stringify(projects),
        );
        sessionStorage.setItem(
          `arina-scenario-transactions-${scenarioId}`,
          JSON.stringify(transactions),
        );
        localStorage.setItem(
          `arina-scenario-transactions-${scenarioId}`,
          JSON.stringify(transactions),
        );
      }, { projectId: localDemoProjectId, userId: localDemoUserId });
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/keuangan', { waitUntil: 'domcontentloaded' });

      const selectedProject = page.getByRole('combobox', { name: 'Proyek Arus Kas E2E', exact: true });
      await expect(selectedProject).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit proyek', exact: true })).toBeEnabled();

      // MobileBottomNav is client-only; wait for it only after the selected
      // project confirms that the auth and finance-project hooks have hydrated.
      await expect(page.locator('[aria-label="Navigasi Utama"]')).toBeVisible();
      const financeTablist = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' });
      await expect(financeTablist).toBeVisible();
      const cashFlowTab = financeTablist.getByRole('tab', { name: 'Arus Kas', exact: true });
      await expect(cashFlowTab).toBeVisible();
      await cashFlowTab.click();
      await expect(cashFlowTab).toHaveAttribute('aria-selected', 'true');

      const cashFlowPanel = page.getByTestId('finance-panel-arus-kas');
      await expect(cashFlowPanel).toBeVisible();
      const cashFlowCards = cashFlowPanel.getByRole('article', { name: /^Arus kas / });
      await expect(cashFlowCards).toHaveCount(2);

      const januaryCard = cashFlowPanel.getByRole('article', { name: 'Arus kas Januari 2026', exact: true });
      await expect(januaryCard).toBeVisible();
      const detailButton = januaryCard.getByRole('button', { name: 'Detail transaksi Januari 2026', exact: true });
      await expect(detailButton).toBeVisible();
      await expect(detailButton).toHaveAttribute('aria-expanded', 'false');
      await detailButton.click();
      await expect(detailButton).toHaveAttribute('aria-expanded', 'true');

      const januaryTransactions = januaryCard.getByRole('list', { name: 'Transaksi Januari 2026', exact: true });
      await expect(januaryTransactions).toBeVisible();
      await expect(januaryTransactions.getByText('Penjualan gabah Januari', { exact: true })).toBeVisible();
      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
