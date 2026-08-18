import { expect, test, type Locator, type Page } from '@playwright/test';

const localDemoUserId = '00000000-0000-4000-8000-000000000002';

const cashFlowTransactions = [
  {
    jenis: 'pendapatan' as const,
    kategori: 'Penjualan Hasil Panen',
    nominal: '5000000',
    tanggal: '15-01-2026',
    keterangan: 'Penjualan gabah Januari',
  },
  {
    jenis: 'pengeluaran' as const,
    kategori: 'Pupuk',
    nominal: '1200000',
    tanggal: '20-01-2026',
    keterangan: 'Pembelian pupuk Januari',
  },
  {
    jenis: 'pendapatan' as const,
    kategori: 'Penjualan Hasil Panen',
    nominal: '3400000',
    tanggal: '12-02-2026',
    keterangan: 'Penjualan gabah Februari',
  },
  {
    jenis: 'pengeluaran' as const,
    kategori: 'Pupuk',
    nominal: '900000',
    tanggal: '18-02-2026',
    keterangan: 'Pembelian pupuk Februari',
  },
];

const mobileViewports = [
  { height: 568, name: '320x568', width: 320 },
  { height: 844, name: '390x844', width: 390 },
];

async function chooseDialogOption(
  page: Page,
  dialog: Locator,
  label: string,
  option: string,
) {
  const select = dialog.getByRole('combobox', { name: label, exact: true });
  await expect(select).toHaveCount(1);
  await select.click();

  const menuOption = page.getByRole('option', { name: option, exact: true });
  await expect(menuOption).toHaveCount(1);
  await menuOption.click();
}

async function fillTransactionDraft(
  page: Page,
  dialog: Locator,
  transaction: (typeof cashFlowTransactions)[number],
) {
  if (transaction.jenis === 'pendapatan') {
    await chooseDialogOption(page, dialog, 'Jenis Transaksi', 'Pendapatan');
  }

  const date = dialog.getByRole('textbox', { name: 'Tanggal', exact: true });
  const amount = dialog.getByRole('textbox', { name: 'Nominal', exact: true });
  const notes = dialog.getByRole('textbox', { name: 'Detail / Catatan (opsional)', exact: true });
  await expect(date).toHaveCount(1);
  await expect(amount).toHaveCount(1);
  await expect(notes).toHaveCount(1);

  await date.fill(transaction.tanggal);
  await chooseDialogOption(page, dialog, 'Kategori', transaction.kategori);
  await amount.fill(transaction.nominal);
  await notes.fill(transaction.keterangan);
}

test.describe('regular cashflow mobile reports', () => {
  for (const viewport of mobileViewports) {
    test(`shows populated, expandable cashflow cards at ${viewport.name}`, async ({ browserName, page }) => {
      test.skip(browserName !== 'chromium', 'This is a Chromium mobile viewport smoke.');

      await page.addInitScript((userId) => {
        // Playwright creates a fresh context per test. Only local guest-auth
        // and guide-completion state are seeded; finance data comes from UI.
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('arina_auth_mode', 'local');
        localStorage.setItem('arina_local_user_id', userId);
        localStorage.setItem('arina_user_id', userId);
        localStorage.setItem('arina-guide:v1:global', 'true');
        localStorage.setItem('arina-guide:v1:finance', 'true');
      }, localDemoUserId);
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/keuangan', { waitUntil: 'domcontentloaded' });

      const mobileNav = page.locator('[aria-label="Navigasi Utama"]');
      await expect(mobileNav).toBeVisible();
      await page.getByRole('button', { name: 'Buat Proyek', exact: true }).click();

      const projectDialog = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
      await expect(projectDialog).toBeVisible();
      const projectName = projectDialog.getByRole('textbox', { name: /^Nama Proyek/ });
      const commodity = projectDialog.getByRole('textbox', { name: /^Komoditas Utama/ });
      const season = projectDialog.getByRole('textbox', { name: 'Label Musim Tanam', exact: true });
      const startDate = projectDialog.getByRole('textbox', { name: 'Tanggal Mulai', exact: true });
      const endDate = projectDialog.getByRole('textbox', { name: 'Tanggal Selesai', exact: true });
      await expect(projectName).toHaveCount(1);
      await expect(commodity).toHaveCount(1);
      await expect(season).toHaveCount(1);
      await expect(startDate).toHaveCount(1);
      await expect(endDate).toHaveCount(1);
      await projectName.fill('Proyek Arus Kas E2E');
      await commodity.fill('Padi');
      await season.fill('MT 2026');
      await startDate.fill('01-01-2026');
      await endDate.fill('28-02-2026');
      await projectDialog.getByRole('button', { name: 'Buat Proyek', exact: true }).click();
      await expect(projectDialog).toBeHidden();

      const selectedProject = page.getByRole('combobox').filter({ hasText: /^Proyek Arus Kas E2E$/ });
      await expect(selectedProject).toHaveCount(1);
      await expect(selectedProject).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit proyek', exact: true })).toBeEnabled();

      const scenarioTabs = page.getByRole('tablist', { name: 'Mode skenario keuangan' });
      await expect(scenarioTabs).toBeVisible();
      await expect(scenarioTabs.getByRole('tab', { name: 'Realisasi', exact: true })).toHaveAttribute('aria-selected', 'true');

      const addTransaction = page.getByRole('button', { name: 'add', exact: true });
      await expect(addTransaction).toHaveCount(1);
      await addTransaction.click();

    const transactionDialog = page.getByRole('dialog', { name: /^Catat Transaksi/ });
    await expect(transactionDialog).toHaveCount(1);
      await expect(transactionDialog).toBeVisible();
      for (const [index, transaction] of cashFlowTransactions.entries()) {
        await fillTransactionDraft(page, transactionDialog, transaction);
        if (index < cashFlowTransactions.length - 1) {
          await transactionDialog.getByRole('button', { name: '+ Tambah Transaksi Lagi', exact: true }).click();
        }
      }
      await transactionDialog.getByRole('button', { name: /^Konfirmasi/ }).click();
      await transactionDialog.getByRole('button', { name: 'Simpan Semua (4 transaksi)', exact: true }).click();
      await expect(transactionDialog).toBeHidden();

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
