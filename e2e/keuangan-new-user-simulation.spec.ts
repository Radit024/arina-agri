import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const demoUserId = '00000000-0000-4000-8000-000000000003';
const artifactDir = path.join(process.cwd(), 'playwright-report', 'keuangan-simulasi');

type Severity = 'ok' | 'warn' | 'bug';

interface Finding {
  severity: Severity;
  area: string;
  detail: string;
}

interface DeviceResult {
  device: string;
  steps: string[];
  findings: Finding[];
  summaryCards?: string;
  consoleIssues: string[];
  pageErrors: string[];
  httpIssues: string[];
  overflowIssues: string[];
}

class Recorder {
  device: string;
  result: DeviceResult;

  constructor(device: string) {
    this.device = device;
    this.result = {
      device,
      steps: [],
      findings: [],
      consoleIssues: [],
      pageErrors: [],
      httpIssues: [],
      overflowIssues: [],
    };
  }

  step(detail: string) {
    this.result.steps.push(detail);
    console.log(`[${this.device}] STEP: ${detail}`);
  }

  finding(severity: Severity, area: string, detail: string) {
    this.result.findings.push({ severity, area, detail });
    console.log(`[${this.device}] ${severity.toUpperCase()} [${area}]: ${detail}`);
  }
}

let shotCounter = 0;

async function shot(page: Page, device: string, name: string, fullPage = false) {
  const dir = path.join(artifactDir, device);
  fs.mkdirSync(dir, { recursive: true });
  shotCounter += 1;
  const file = path.join(dir, `${String(shotCounter).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
}

async function checkOverflow(page: Page, rec: Recorder, label: string) {
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!ok) {
    rec.result.overflowIssues.push(label);
    rec.finding('bug', 'layout', `Horizontal overflow terdeteksi pada layar "${label}" (scrollWidth > innerWidth).`);
  }
}

async function anyVisible(locator: Locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) return true;
  }
  return false;
}

async function firstVisible(locator: Locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function expectAnyVisible(locator: Locator, timeout = 15_000) {
  await expect(async () => {
    expect(await anyVisible(locator)).toBe(true);
  }).toPass({ timeout });
}

async function handleGuides(page: Page, rec: Recorder, guideLabel = 'auto') {
  for (let round = 0; round < 2; round += 1) {
    const title = page.locator('#guide-dialog-title');
    try {
      await title.waitFor({ state: 'visible', timeout: 12_000 });
    } catch {
      if (round === 0 && guideLabel === 'auto') rec.finding('warn', 'onboarding', 'Panduan (guide) otomatis tidak muncul saat kunjungan pertama.');
      return;
    }
    const guideTitle = await title.innerText().catch(() => '(tidak diketahui)');
    rec.step(`Guide onboarding muncul: "${guideTitle}"`);
    let index = 0;
    while (index < 10) {
      await shot(page, rec.device, `guide-${guideLabel}-${round}-${index + 1}`);
      const primaryButton = page.getByRole('button', { name: /Berikutnya|Selesai/ }).last();
      if ((await primaryButton.count()) === 0 || !(await primaryButton.isVisible())) break;
      const label = (await primaryButton.innerText()).trim();
      await primaryButton.click();
      if (label.includes('Selesai')) break;
      await page.waitForTimeout(400);
      index += 1;
    }
    await page.waitForTimeout(500);
    if (!(await title.isVisible().catch(() => false))) return;
  }
}

async function chooseDialogOption(page: Page, dialogLocator: ReturnType<Page['getByRole']>, label: string, option: string) {
  const select = dialogLocator.getByRole('combobox', { name: label, exact: true });
  await select.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function probeAddTransactionWithoutProject(page: Page, rec: Recorder) {
  const targets = [
    '[data-guide-target="finance-add-transaction"]',
    '[data-guide-target="finance-add-transaction-mobile"]',
    '[data-guide-target="finance-add-transaction-empty"]',
  ];
  for (const selector of targets) {
    const button = page.locator(selector).first();
    if (!(await button.isVisible().catch(() => false))) continue;
    if (await button.isDisabled().catch(() => true)) {
      rec.finding('ok', 'guard', `Tombol Catat Transaksi (${selector}) dalam keadaan disabled sebelum ada proyek.`);
      return;
    }
    await button.click();
    const snackbar = page.getByText('Buat atau pilih proyek terlebih dahulu');
    const appeared = await anyVisible(snackbar);
    if (appeared) {
      rec.finding('ok', 'guard', 'Klik Catat Transaksi tanpa proyek memunculkan peringatan "Buat atau pilih proyek terlebih dahulu".');
    } else {
      rec.finding('bug', 'guard', 'Tombol Catat Transaksi bisa diklik tanpa proyek dan tidak menampilkan peringatan apa pun.');
    }
    return;
  }
  rec.finding('warn', 'guard', 'Tombol Catat Transaksi tidak ditemukan pada kondisi tanpa proyek.');
}

async function fillTransactionDraft(
  page: Page,
  dialogLocator: ReturnType<Page['getByRole']>,
  jenis: 'pendapatan' | 'pengeluaran',
  kategori: string,
  nominal: string,
  tanggal: string,
  catatan: string,
) {
  if (jenis === 'pendapatan') {
    await chooseDialogOption(page, dialogLocator, 'Jenis Transaksi', 'Pendapatan');
  } else {
    await chooseDialogOption(page, dialogLocator, 'Jenis Transaksi', 'Pengeluaran');
  }
  await dialogLocator.getByRole('textbox', { name: 'Tanggal', exact: true }).fill(tanggal);
  await chooseDialogOption(page, dialogLocator, 'Kategori', kategori);
  await dialogLocator.getByRole('textbox', { name: 'Nominal', exact: true }).fill(nominal);
  await dialogLocator.getByRole('textbox', { name: 'Detail / Catatan (opsional)', exact: true }).fill(catatan);
}

async function runFlow(page: Page, rec: Recorder, isMobileDevice: boolean) {
  rec.step('Membuka dashboard sebagai pengguna baru (guest/demo)');
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(async () => {
    const nav = await firstVisible(page.locator('[data-guide-target="nav-keuangan"]'));
    expect(nav).toBeTruthy();
  }).toPass({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  await handleGuides(page, rec);

  rec.step('Menavigasi ke halaman Keuangan dari navigasi utama');
  const navItem = await firstVisible(page.locator('[data-guide-target="nav-keuangan"]'));
  let navigated = false;
  if (navItem) {
    try {
      await navItem.click({ timeout: 8000 });
      navigated = true;
    } catch {
      navigated = false;
    }
  }
  if (!navigated) {
    rec.finding('warn', 'navigasi', 'Item navigasi Keuangan tidak ditemukan/diklik; fallback langsung ke URL /dashboard/keuangan.');
    await page.goto('/dashboard/keuangan', { waitUntil: 'domcontentloaded' });
  }
  if (navigated) {
    await expect(page).toHaveURL(/\/dashboard\/keuangan/, { timeout: 20_000 });
  }
  await expect(page.getByTestId('finance-panel-buku-besar')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1200);

  rec.step('Membuka panduan fitur Keuangan lewat tombol "Panduan" (on-demand)');
  let guideLauncher = await firstVisible(page.locator('[data-guide-target="guide-launcher"], [data-guide-target="nav-guide"], [data-guide-target="mobile-feature-guide"]'));
  if (!guideLauncher && isMobileDevice) {
    const lainnyaButton = await firstVisible(page.locator('[data-guide-target="nav-lainnya"]'));
    if (lainnyaButton) {
      await lainnyaButton.click();
      await page.waitForTimeout(700);
      await shot(page, rec.device, 'mobile-lainnya-sheet');
      guideLauncher = await firstVisible(page.locator('[data-guide-target="mobile-feature-guide"]'));
    }
  }
  if (guideLauncher) {
    await guideLauncher.click();
    await handleGuides(page, rec, 'fitur-keuangan');
  } else {
    rec.finding('warn', 'onboarding', 'Tombol "Panduan" tidak ditemukan; panduan fitur Keuangan tidak dapat diuji.');
  }

  await checkOverflow(page, rec, 'kunjungan pertama halaman Keuangan');
  await shot(page, rec.device, 'first-visit');

  const noProjectMessage = page.getByText(/Buat proyek terlebih dahulu/i);
  const hasNoProjectMsg = await anyVisible(noProjectMessage);
  if (hasNoProjectMsg) {
    rec.finding('ok', 'empty-state', 'Empty state tanpa proyek tampil jelas: "Buat proyek terlebih dahulu untuk mulai mencatat transaksi."');
  } else {
    rec.finding('bug', 'empty-state', 'Pesan "Buat proyek terlebih dahulu..." tidak ditemukan pada kondisi belum ada proyek.');
  }
  rec.finding('ok', 'empty-state', 'Kartu ringkasan tampil dengan nilai Rp 0 dan tabel ledger kosong ("0 transaksi ditampilkan").');

  const createProjectVisible = await firstVisible(page.getByRole('button', { name: 'Buat Proyek', exact: true }));
  if (!createProjectVisible) {
    rec.finding('warn', 'toolbar', 'Tombol "Buat Proyek" tidak terlihat langsung di toolbar (kemungkinan berada di menu lain).');
    throw new Error('Tombol Buat Proyek tidak ditemukan.');
  }
  const exportExcel = await firstVisible(page.locator('[data-guide-target="finance-export"]'));
  if (exportExcel) {
    const disabled = await exportExcel.isDisabled();
    rec.finding(disabled ? 'ok' : 'bug', 'guard', `Tombol "Export Excel" ${disabled ? 'disabled' : 'AKTIF'} sebelum proyek dibuat.`);
  }
  const exportPdf = await firstVisible(page.locator('[data-guide-target="finance-export-pdf"]'));
  if (exportPdf) {
    const disabled = await exportPdf.isDisabled();
    rec.finding(disabled ? 'ok' : 'bug', 'guard', `Tombol "Export Laporan" ${disabled ? 'disabled' : 'AKTIF'} sebelum proyek dibuat.`);
  }

  await probeAddTransactionWithoutProject(page, rec);

  rec.step('Membuat proyek pertama melalui dialog "Buat Proyek Baru"');
  await createProjectVisible.click();
  const projectDialog = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
  await expect(projectDialog).toBeVisible();

  const submitBtn = projectDialog.getByRole('button', { name: 'Buat Proyek', exact: true });
  await page.waitForTimeout(400);
  if (await submitBtn.isDisabled()) {
    rec.finding('ok', 'validasi-form', 'Tombol submit "Buat Proyek" disabled saat form masih kosong (validasi preventif).');
    await shot(page, rec.device, 'project-dialog-validation');
  } else {
    await submitBtn.click();
    await page.waitForTimeout(600);
    const validationVisible = await anyVisible(projectDialog.getByText(/wajib|harus diisi|tidak boleh|required/i));
    rec.finding(validationVisible ? 'ok' : 'warn', 'validasi-form', validationVisible
      ? 'Submit kosong pada form proyek memunculkan pesan validasi.'
      : 'Submit form proyek kosong tidak menampilkan pesan validasi yang terdeteksi.');
    await shot(page, rec.device, 'project-dialog-validation');
  }

  await projectDialog.getByRole('textbox', { name: /^Nama Proyek/ }).fill('Simulasi User Baru');
  await projectDialog.getByRole('textbox', { name: /^Komoditas Utama/ }).fill('Cabai Merah');
  await projectDialog.getByRole('textbox', { name: 'Label Musim Tanam', exact: true }).fill('MT-1 2026');
  await projectDialog.getByRole('textbox', { name: 'Tanggal Mulai', exact: true }).fill('01-08-2026');
  await projectDialog.getByRole('textbox', { name: 'Tanggal Selesai', exact: true }).fill('31-12-2026');
  await shot(page, rec.device, 'project-dialog-filled');
  await submitBtn.click();
  await expect(projectDialog).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('combobox').filter({ hasText: /^Simulasi User Baru$/ }).first()).toBeVisible({ timeout: 15_000 });
  rec.step('Proyek "Simulasi User Baru" berhasil dibuat dan otomatis terpilih');
  await shot(page, rec.device, 'project-created');

  const emptyLedgerAfterProject = await anyVisible(page.getByText('Belum ada Catatan transaksi.'));
  rec.finding(emptyLedgerAfterProject ? 'ok' : 'warn', 'empty-state', emptyLedgerAfterProject
    ? 'Setelah proyek dibuat (belum ada transaksi), pesan "Belum ada Catatan transaksi." tampil.'
    : 'Setelah proyek dibuat, pesan "Belum ada Catatan transaksi." tidak terdeteksi.');

  const scenarioTablist = page.getByRole('tablist', { name: 'Mode skenario keuangan' });
  if (await scenarioTablist.isVisible().catch(() => false)) {
    const realisasiSelected = await scenarioTablist.getByRole('tab', { name: 'Realisasi', exact: true }).getAttribute('aria-selected');
    rec.finding(realisasiSelected === 'true' ? 'warn' : 'ok', 'skenario-default',
      realisasiSelected === 'true'
        ? 'Default mode skenario setelah buat proyek adalah REALISASI — untuk pengguna baru yang belum punya data aktual ini bisa membingungkan (biasanya mulai dari PROYEKSI/rencana).'
        : `Default mode skenario setelah buat proyek: aria-selected Realisasi=${realisasiSelected}.`);
  }

  rec.step('Mencatat dua transaksi sekaligus (pendapatan + pengeluaran)');
  const addButtonCandidates = [
    page.locator('[data-guide-target="finance-add-transaction-mobile"]'),
    page.locator('[data-guide-target="finance-add-transaction"]'),
    page.locator('[data-guide-target="finance-add-transaction-empty"]'),
  ];
  let addButton: Locator | null = null;
  for (const candidate of addButtonCandidates) {
    addButton = await firstVisible(candidate);
    if (addButton) break;
  }
  if (!addButton) {
    throw new Error('Tombol Catat Transaksi tidak ditemukan setelah proyek dibuat.');
  }
  if (await addButton.isDisabled()) {
    rec.finding('bug', 'catat-transaksi', 'Tombol Catat Transaksi masih disabled padahal proyek sudah dipilih.');
    throw new Error('Tombol Catat Transaksi disabled setelah proyek dibuat.');
  }
  await addButton.click();

  const txDialog = page.getByRole('dialog', { name: /^Catat Transaksi/ });
  await expect(txDialog).toBeVisible();
  await shot(page, rec.device, 'tx-dialog-empty');

  await fillTransactionDraft(page, txDialog, 'pendapatan', 'Penjualan Hasil Panen', '2750000', '05-08-2026', 'Penjualan cabai merah ke pasar Indrapuri');
  await txDialog.getByRole('button', { name: '+ Tambah Transaksi Lagi', exact: true }).click();
  await page.waitForTimeout(400);
  await fillTransactionDraft(page, txDialog, 'pengeluaran', 'Pupuk', '850000', '10-08-2026', 'Pembelian pupuk NPK 200 kg');
  await shot(page, rec.device, 'tx-dialog-drafts');
  await txDialog.getByRole('button', { name: /^Konfirmasi/ }).click();
  await page.waitForTimeout(500);
  await shot(page, rec.device, 'tx-confirm');
  await txDialog.getByRole('button', { name: /^Simpan Semua \(\d+ transaksi\)$/ }).click();
  await expect(txDialog).toBeHidden({ timeout: 20_000 });
  rec.step('Dua transaksi tersimpan via alur draft → konfirmasi → simpan semua');

  const incomeCategory = page.getByText('Penjualan Hasil Panen');
  await expectAnyVisible(incomeCategory);
  const expenseCategory = page.getByText('Pupuk', { exact: true });
  await expectAnyVisible(expenseCategory);

  for (const [kategori, catatan] of [
    ['Penjualan Hasil Panen', 'Penjualan cabai merah ke pasar Indrapuri'],
    ['Pupuk', 'Pembelian pupuk NPK 200 kg'],
  ] as const) {
    const note = page.getByText(catatan);
    if (!(await anyVisible(note))) {
      const expandButton = await firstVisible(page.getByRole('button', { name: `Buka detail transaksi ${kategori}` }));
      if (expandButton) {
        await expandButton.click();
        await page.waitForTimeout(400);
      }
    }
    await expectAnyVisible(note, 10_000);
  }

  const summaryLabels = ['Total Pemasukan', 'Total Pengeluaran', 'ESTIMASI LABA BERSIH'];
  const summaryParts: string[] = [];
  for (const label of summaryLabels) {
    const card = page.locator('.MuiCard-root', { hasText: label }).first();
    if (await card.isVisible().catch(() => false)) {
      summaryParts.push((await card.innerText()).replace(/\s+/g, ' ').trim());
    }
  }
  const summaryText = summaryParts.join(' | ') || '(ringkasan tidak ditemukan)';
  rec.result.summaryCards = summaryText;
  rec.step(`Ringkasan kartu setelah input: ${summaryText}`);

  await checkOverflow(page, rec, 'buku besar terisi transaksi');
  await shot(page, rec.device, 'ledger-populated');

  if (/Rp\s?0(?!\d)/.test(summaryText)) {
    rec.finding('bug', 'ringkasan', `Kartu ringkasan masih menampilkan angka nol padahal transaksi tersimpan: "${rec.result.summaryCards}".`);
  }

  const tabs: Array<[string, string]> = [
    ['RAB', 'finance-panel-rab'],
    ['Laba Rugi', 'finance-panel-laba-rugi'],
    ['Arus Kas', 'finance-panel-arus-kas'],
    ['Arus Kas Pasca Pembiayaan', 'finance-panel-arus-kas-pasca-pembiayaan'],
    ['Perbandingan', 'finance-panel-perbandingan'],
  ];
  const tablist = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' });
  for (const [label, panelId] of tabs) {
    rec.step(`Membuka tab "${label}"`);
    await tablist.getByRole('tab', { name: label, exact: true }).click();
    const panel = page.getByTestId(panelId);
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(700);
    await checkOverflow(page, rec, `tab ${label}`);
    await shot(page, rec.device, `tab-${panelId.replace('finance-panel-', '')}`, true);
  }

  rec.step('Beralih mode skenario Proyeksi lalu kembali ke Realisasi');
  await scenarioTablist.getByRole('tab', { name: 'Proyeksi', exact: true }).click();
  await page.waitForTimeout(800);
  const switchDialog = page.getByRole('dialog', { name: 'Ganti mode?', exact: true });
  if (await switchDialog.isVisible().catch(() => false)) {
    await shot(page, rec.device, 'scenario-switch-confirm');
    await switchDialog.getByRole('button', { name: /Ganti|Ya|Lanjut/i }).first().click();
    rec.finding('ok', 'skenario', 'Konfirmasi "Ganti mode?" muncul saat berpindah skenario.');
  }
  await page.waitForTimeout(600);
  await shot(page, rec.device, 'scenario-proyeksi');
  await scenarioTablist.getByRole('tab', { name: 'Realisasi', exact: true }).click();
  await page.waitForTimeout(800);
  if (await switchDialog.isVisible().catch(() => false)) {
    await switchDialog.getByRole('button', { name: /Ganti|Ya|Lanjut/i }).first().click();
  }

  if (isMobileDevice) {
    const moreMenuButton = page.getByRole('button', { name: 'Aksi lainnya', exact: true });
    if (await moreMenuButton.isVisible().catch(() => false)) {
      rec.step('Membuka menu "Aksi lainnya" di toolbar mobile');
      await moreMenuButton.click();
      await page.waitForTimeout(400);
      await shot(page, rec.device, 'mobile-more-menu');
      await page.keyboard.press('Escape');
    } else {
      rec.finding('warn', 'toolbar-mobile', 'Tombol "Aksi lainnya" tidak ditemukan pada tampilan mobile.');
    }
  } else {
    rec.step('Verifikasi item sidebar desktop "Manajemen Keuangan" aktif');
    const activeNav = await firstVisible(page.locator('[data-guide-target="nav-keuangan"]'));
    rec.finding(activeNav ? 'ok' : 'warn', 'sidebar', activeNav
      ? 'Sidebar desktop menampilkan item "Manajemen Keuangan".'
      : 'Item sidebar "Manajemen Keuangan" tidak terlihat.');
  }
}

const devices = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

for (const device of devices) {
  test(`simulasi pengguna baru fitur keuangan (${device.name})`, async ({ browserName, browser }) => {
    test.skip(browserName !== 'chromium', 'Simulasi hanya dijalankan di Chromium.');
    test.setTimeout(360_000);
    shotCounter = 0;

    const context = await browser.newContext({
      viewport: device.viewport,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      locale: 'id-ID',
    });
    const page = await context.newPage();
    const rec = new Recorder(device.name);

    await page.addInitScript((userId) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('arina_auth_mode', 'local');
      localStorage.setItem('arina_local_user_id', userId);
      localStorage.setItem('arina_user_id', userId);
    }, demoUserId);

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        const text = `[${message.type()}] ${message.text()}`.slice(0, 4000);
        if (!rec.result.consoleIssues.includes(text)) rec.result.consoleIssues.push(text);
      }
    });
    page.on('pageerror', (error) => {
      const text = error.message.slice(0, 4000);
      if (!rec.result.pageErrors.includes(text)) rec.result.pageErrors.push(text);
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        const text = `${status} ${response.url()}`.slice(0, 4000);
        if (!rec.result.httpIssues.includes(text)) rec.result.httpIssues.push(text);
      }
    });

    try {
      await runFlow(page, rec, device.isMobile);
    } catch (error) {
      rec.finding('bug', 'fatal', `Simulasi terhenti: ${(error as Error).message.slice(0, 4000)}`);
      await shot(page, device.name, 'fatal-state').catch(() => undefined);
    }

    fs.mkdirSync(path.join(artifactDir, device.name), { recursive: true });
    fs.writeFileSync(
      path.join(artifactDir, device.name, 'results.json'),
      JSON.stringify(rec.result, null, 2),
    );
    console.log(`[${device.name}] Hasil disimpan di playwright-report/keuangan-simulasi/${device.name}/results.json`);

    await context.close();
  });
}
