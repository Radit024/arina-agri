import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const XLSX_PATH = path.join('references', 'CATATAN KEUANGAN PADI 1 Ha ADE.xlsx');

/**
 * Angka acuan diambil dari `references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx`
 * (sheet "3. Laporan laba rugi" dan "5. Arus Kas Pasca Pembiyaan"):
 *   Total Pemasukan  Rp 45.500.000  (Penjualan gabah kering GKP)
 *   Total Pengeluaran Rp 22.159.000 (ledger 15.159.000 + Sewa Lahan 7.000.000)
 *   Laba / Rugi     Rp 23.341.000
 *
 * Test ini sengaja mengunci angka yang SUDAH benar supaya regresi pada parser,
 * importer, atau perhitungan keuangan langsung ketahuan.
 */

const EXPECTED = {
  pemasukan: 'Rp 45.500.000',
  pengeluaran: 'Rp 22.159.000',
  laba: 'Rp 23.341.000',
};

const DEMO_USER_ID = '00000000-0000-4000-8000-0000000000e1';

// Impor Excel di dev server butuh waktu untuk kompilasi route on-demand Turbopack.
test.describe.configure({ timeout: 180_000 });

async function firstVisible(locator: Locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) return locator.nth(index);
  }
  return null;
}

async function dismissTourIfPresent(page: Page) {
  const skip = page.getByRole('button', { name: 'Lewati', exact: true });
  if (await skip.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(1_200);
  }
}

async function startGuestSession(page: Page, clearStorage = false) {
  await page.addInitScript(
    ({ userId, clear }) => {
      if (clear) {
        localStorage.clear();
        sessionStorage.clear();
      }
      localStorage.setItem('arina_auth_mode', 'local');
      localStorage.setItem('arina_local_user_id', userId);
      localStorage.setItem('arina_user_id', userId);
    },
    { userId: DEMO_USER_ID, clear: clearStorage },
  );
}

async function openFinancePage(page: Page, projectName: string) {
  await page.goto('/dashboard/keuangan', { waitUntil: 'load' });
  await page.waitForTimeout(2_500);
  await dismissTourIfPresent(page);

  const createProject = await firstVisible(page.getByRole('button', { name: 'Buat Proyek', exact: true }));
  if (!createProject) return;

  await createProject.click();
  const dialog = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
  await dialog.waitFor({ state: 'visible', timeout: 20_000 });
  await dialog.getByRole('textbox', { name: /^Nama Proyek/ }).fill(projectName);
  await dialog.getByRole('textbox', { name: /^Komoditas Utama/ }).fill('Padi');
  await dialog.getByRole('textbox', { name: 'Tanggal Mulai', exact: true }).fill('01-08-2026');
  await dialog.getByRole('textbox', { name: 'Tanggal Selesai', exact: true }).fill('31-12-2026');
  await dialog.getByRole('button', { name: 'Buat Proyek', exact: true }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
  await page.waitForTimeout(2_000);
}

async function openImportDialog(page: Page) {
  const importButton = await firstVisible(page.getByRole('button', { name: /Import Excel/i }));
  expect(importButton, 'tombol "Import Excel" harus tersedia').not.toBeNull();
  await importButton!.click();
  const fileInput = page.locator('[role="dialog"] input[type=file]').first();
  await fileInput.waitFor({ state: 'attached', timeout: 20_000 });
  await fileInput.setInputFiles(XLSX_PATH);
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Lanjutkan Impor/i }).click();
}

async function confirmImport(page: Page) {
  const confirm = page.getByRole('button', { name: /Konfirmasi & Simpan ke Sistem/i });
  await confirm.waitFor({ state: 'visible', timeout: 40_000 });
  await confirm.click();
  await expect(page.getByText('Impor Berhasil Disimpan')).toBeVisible({ timeout: 60_000 });
}

async function readSummaryCards(page: Page) {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    for (const label of ['Total Pemasukan', 'Total Pengeluaran', 'ESTIMASI LABA BERSIH']) {
      const card = Array.from(document.querySelectorAll('.MuiCard-root')).find((element) =>
        ((element as HTMLElement).innerText || '').includes(label),
      );
      if (card) out[label] = ((card as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
    }
    return out;
  });
}

test.beforeAll(() => {
  expect(fs.existsSync(XLSX_PATH)).toBe(true);
});

test('import RAB dari Excel referensi menghasilkan angka yang sama persis dengan file', async ({ page }) => {
  await startGuestSession(page);
  await page.goto('/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(2_500);
  await dismissTourIfPresent(page);

  await openFinancePage(page, 'USAHATANI PADI 1 HA');
  await openImportDialog(page);
  await confirmImport(page);

  await expect(page.getByText('38 transaksi ditampilkan')).toBeVisible({ timeout: 30_000 });

  const cards = await readSummaryCards(page);
  expect(cards['Total Pemasukan']).toContain(EXPECTED.pemasukan);
  expect(cards['Total Pengeluaran']).toContain(EXPECTED.pengeluaran);
  expect(cards['ESTIMASI LABA BERSIH']).toContain(EXPECTED.laba);
});

test('reconciliation menandai pendapatan sebagai tidak diperiksa, bukan lolos diam-diam', async ({ page }) => {
  await startGuestSession(page);
  await page.goto('/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(2_500);
  await dismissTourIfPresent(page);

  await openFinancePage(page, 'Rekonsiliasi Padi');
  await openImportDialog(page);

  await expect(page.getByText('Pemeriksaan Total per Kelompok Biaya')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText('tidak diperiksa')).toBeVisible({ timeout: 15_000 });
});

test('baris yang dilewati ditampilkan lengkap dengan alasannya', async ({ page }) => {
  await startGuestSession(page);
  await page.goto('/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(2_500);
  await dismissTourIfPresent(page);

  await openFinancePage(page, 'Skipped Rows Padi');
  await openImportDialog(page);
  await confirmImport(page);

  const skippedTable = page.getByTestId('rab-import-skipped-rows');
  await expect(skippedTable).toBeVisible({ timeout: 15_000 });
  await expect(skippedTable).toContainText('HPP');
  await expect(skippedTable).toContainText('B/C ratio');
});

test('form login menampilkan pesan validasi berbahasa Indonesia, bukan bubble browser', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'load' });
  await page.waitForTimeout(2_000);

  await page.getByRole('textbox', { name: 'Alamat Email' }).fill('bukan-email');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.waitForTimeout(1_500);

  await expect(page.getByText('Format email tidak valid')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('textbox', { name: 'Alamat Email' })).toHaveAttribute('aria-invalid', 'true');
});

test('Tambah Batch tersedia di tampilan mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Khusus viewport mobile');

  await startGuestSession(page);
  await page.goto('/dashboard/stok', { waitUntil: 'load' });
  await page.waitForTimeout(4_000);

  const addBatch = page.getByRole('button', { name: /^Tambah Batch$/ });
  await expect(addBatch).toBeVisible({ timeout: 20_000 });
  await expect(addBatch).toBeEnabled();
});

test('halaman Stok tidak menampilkan data dummy untuk pengguna baru', async ({ page }) => {
  await startGuestSession(page, true);
  await page.goto('/dashboard/stok', { waitUntil: 'load' });
  await page.waitForTimeout(4_000);

  await expect(page.getByText('BATCH-001-A')).toHaveCount(0);
  await expect(page.getByText('BATCH-002-B')).toHaveCount(0);
  await expect(page.getByText(/Total Stok Siap Jual/)).toBeVisible({ timeout: 20_000 });
});