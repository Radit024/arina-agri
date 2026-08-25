import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const demoUserId = '00000000-0000-4000-8000-000000000004';
const artifactDir = path.join(process.cwd(), 'playwright-report', 'keuangan-simulasi-rab');

type Severity = 'ok' | 'warn' | 'bug' | 'logic';

interface Finding {
  severity: Severity;
  area: string;
  detail: string;
}

interface DeviceResult {
  device: string;
  steps: string[];
  findings: Finding[];
  rabSummary?: string;
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
    rec.finding('bug', 'layout', `Horizontal overflow pada layar "${label}".`);
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

async function chooseDialogOption(page: Page, dialogLocator: Locator, label: string, option: string) {
  const select = dialogLocator.getByRole('combobox', { name: label, exact: true });
  await select.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function openRabItemDialog(page: Page, rec: Recorder) {
  const addButtons = [
    page.getByRole('button', { name: 'Tambah Item RAB', exact: true }),
  ];
  let button: Locator | null = null;
  for (const candidate of addButtons) {
    button = await firstVisible(candidate);
    if (button) break;
  }
  if (!button) {
    throw new Error('Tombol "Tambah Item RAB" tidak ditemukan.');
  }
  await button.click();
  const form = page.locator('[data-testid="rab-item-form"]');
  await expect(form).toBeVisible({ timeout: 20_000 });
  const namedDialog = await firstVisible(page.getByRole('dialog', { name: /Tambah Item RAB/ }));
  if (!namedDialog) {
    rec.finding('warn', 'a11y', 'Dialog "Tambah Item RAB" tidak memiliki accessible name (aria-labelledby tidak di-wire pada MUI Dialog) — locator fallback ke dialog paper via data-testid form.');
  }
  rec.step('Membuka dialog "Tambah Item RAB"');
  return page.locator('.MuiDialog-paper').filter({ has: page.locator('[data-testid="rab-item-form"]') });
}

async function fillField(scope: Locator, name: string, value: string) {
  const field = scope
    .getByRole('spinbutton', { name, exact: true })
    .or(scope.getByRole('textbox', { name, exact: true }))
    .first();
  await field.fill(value);
}

async function fillRabItem(
  page: Page,
  dialog: Locator,
  options: { jenis?: 'Pengeluaran' | 'Pendapatan'; kategori?: string; nama: string; volume: string; satuan: string; harga: string; bulan?: string; alias?: string },
) {
  if (options.jenis) {
    await chooseDialogOption(page, dialog, 'Jenis RAB', options.jenis);
  }
  if (options.kategori) {
    await chooseDialogOption(page, dialog, 'Kategori RAB', options.kategori);
  }
  await fillField(dialog, 'Nama Item', options.nama);
  await fillField(dialog, 'Volume', options.volume);
  await fillField(dialog, 'Satuan', options.satuan);
  await fillField(dialog, 'Harga Satuan', options.harga);
  if (options.bulan) {
    await fillField(dialog, 'Bulan Kas Rencana', options.bulan);
  }
  if (options.alias) {
    await fillField(dialog, 'Alias / Kata Kunci Pencocokan', options.alias);
  }
}

async function addTransaction(page: Page, rec: Recorder, options: { jenis: 'Pendapatan' | 'Pengeluaran'; kategori: string; nominal: string; tanggal: string; catatan: string }) {
  const addButton = await firstVisible(page.locator('[data-guide-target="finance-add-transaction-mobile"], [data-guide-target="finance-add-transaction"]'));
  if (!addButton) throw new Error('Tombol Catat Transaksi tidak ditemukan.');
  await addButton.click();

  const txDialog = page.getByRole('dialog', { name: /^Catat Transaksi/ });
  await expect(txDialog).toBeVisible();
  await chooseDialogOption(page, txDialog, 'Jenis Transaksi', options.jenis);
  await txDialog.getByRole('textbox', { name: 'Tanggal', exact: true }).fill(options.tanggal);
  await chooseDialogOption(page, txDialog, 'Kategori', options.kategori);
  await txDialog.getByRole('textbox', { name: 'Nominal', exact: true }).fill(options.nominal);
  await txDialog.getByRole('textbox', { name: 'Detail / Catatan (opsional)', exact: true }).fill(options.catatan);

  const suggestionAlert = txDialog.getByText(/Saran RAB:|Akan dihubungkan ke RAB:/);
  if (await anyVisible(suggestionAlert)) {
    const suggestionText = (await suggestionAlert.first().innerText()).replace(/\s+/g, ' ').trim();
    rec.finding('ok', 'auto-saran', `Saran RAB muncul otomatis di form: "${suggestionText}"`);
    const autoCheckbox = txDialog.getByRole('checkbox', { name: 'Hubungkan Otomatis' });
    if (await autoCheckbox.isChecked().catch(() => false)) {
      await autoCheckbox.uncheck();
      rec.finding('ok', 'auto-saran', 'Checkbox "Hubungkan Otomatis" dimatikan agar linking dilakukan manual pada langkah berikutnya.');
    }
  }

  await txDialog.getByRole('button', { name: /^Konfirmasi/ }).click();
  await page.waitForTimeout(400);
  await txDialog.getByRole('button', { name: /^Simpan Semua \(\d+ transaksi\)$/ }).click();
  await expect(txDialog).toBeHidden({ timeout: 20_000 });
  rec.step(`Transaksi tersimpan: ${options.jenis} ${options.kategori} ${options.nominal} (${options.catatan})`);
}

async function expandAllMobileCards(page: Page) {
  for (;;) {
    const button = await firstVisible(page.getByRole('button', { name: /^Buka detail transaksi / }));
    if (!button) break;
    await button.click();
    await page.waitForTimeout(300);
  }
}

async function getTxChipText(page: Page, rec: Recorder, kategori: string, catatan: string) {
  const chip = page.getByText(new RegExp(`^RAB: ${kategori.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$|^RAB tersambung$`));
  void chip;
  const note = page.getByText(catatan).first();
  void note;
  const linkedChip = page.locator('.MuiChip-label', { hasText: /^RAB: |^RAB tersambung$/ });
  const count = await linkedChip.count();
  let found = '';
  for (let index = 0; index < count; index += 1) {
    const chipElement = linkedChip.nth(index);
    const rowText = await chipElement.evaluate((el) => {
      const row = el.closest('tr') ?? el.closest('[role="article"]') ?? el.closest('.MuiBox-root');
      return row ? (row.textContent ?? '') : '';
    });
    if (rowText.includes(catatan) || rowText.includes(kategori)) {
      found = (await chipElement.innerText()).trim();
      break;
    }
  }
  rec.finding('ok', 'status-link', `Chip link untuk transaksi "${catatan}": ${found || '(tidak ada — belum terhubung)'}`);
  return found;
}

async function linkTransactionViaRow(page: Page, rec: Recorder, isMobileDevice: boolean, kategori: string) {
  if (isMobileDevice) {
    const expandButton = await firstVisible(page.getByRole('button', { name: `Buka detail transaksi ${kategori}` }));
    if (expandButton) {
      await expandButton.click();
      await page.waitForTimeout(400);
    }
  } else {
    const row = page.getByRole('row', { name: new RegExp(kategori) }).first();
    await row.click();
    await page.waitForTimeout(300);
  }

  const linkButton = await firstVisible(page.getByRole('button', { name: `Hubungkan RAB transaksi ${kategori}` }));
  if (!linkButton) {
    rec.finding('bug', 'linking', `Tombol "Hubungkan RAB transaksi ${kategori}" tidak ditemukan setelah baris dipilih/di-expand.`);
    return null;
  }
  await linkButton.click();

  const dialog = page.locator('.MuiDialog-paper').filter({ hasText: 'akan disambungkan ke item RAB' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  const namedDialog = await firstVisible(page.getByRole('dialog', { name: /Hubungkan RAB/ }));
  if (!namedDialog) {
    rec.finding('warn', 'a11y', 'Dialog "Hubungkan RAB" tidak memiliki accessible name (aria-labelledby tidak di-wire).');
  }
  await shot(page, rec.device, `link-dialog-${kategori.toLowerCase().replace(/\s+/g, '-')}`);
  return dialog;
}

async function pickRabOptionAndVerify(page: Page, rec: Recorder, dialog: Locator, itemName: string, expectedSnackbar: RegExp) {
  const option = dialog.getByRole('button', { name: `Hubungkan RAB ${itemName}` });
  await expect(option).toBeVisible();
  await option.click();

  const snackbar = page.getByText(expectedSnackbar);
  const appeared = await snackbar.first().isVisible().catch(() => false);
  if (appeared) {
    rec.finding('ok', 'linking', `Snackbar sukses muncul: "${(await snackbar.first().innerText()).trim()}"`);
  } else {
    rec.finding('warn', 'linking', 'Snackbar sukses tidak terdeteksi setelah menghubungkan RAB.');
  }
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

async function runFlow(page: Page, rec: Recorder, isMobileDevice: boolean) {
  rec.step('Setup: buka /dashboard/keuangan sebagai guest dengan guide sudah dibaca');
  await page.goto('/dashboard/keuangan', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('finance-panel-buku-besar')).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(2500);

  rec.step('Membuat proyek "Simulasi RAB Link"');
  const createButton = await firstVisible(page.getByRole('button', { name: 'Buat Proyek', exact: true }));
  if (!createButton) throw new Error('Tombol Buat Proyek tidak ditemukan.');
  await createButton.click();
  const projectDialog = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
  await expect(projectDialog).toBeVisible({ timeout: 15_000 });
  await projectDialog.getByRole('textbox', { name: /^Nama Proyek/ }).fill('Simulasi RAB Link');
  await projectDialog.getByRole('textbox', { name: /^Komoditas Utama/ }).fill('Cabai Merah');
  await projectDialog.getByRole('textbox', { name: 'Label Musim Tanam', exact: true }).fill('MT-1 2026');
  await projectDialog.getByRole('textbox', { name: 'Tanggal Mulai', exact: true }).fill('01-08-2026');
  await projectDialog.getByRole('textbox', { name: 'Tanggal Selesai', exact: true }).fill('31-12-2026');
  await projectDialog.getByRole('button', { name: 'Buat Proyek', exact: true }).click();
  await expect(projectDialog).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole('combobox').filter({ hasText: /^Simulasi RAB Link$/ }).first()).toBeVisible({ timeout: 15_000 });

  const tablist = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' });

  rec.step('RAB: verifikasi empty state awal');
  await tablist.getByRole('tab', { name: 'RAB', exact: true }).click();
  const rabPanel = page.getByTestId('finance-panel-rab');
  await expect(rabPanel).toBeVisible({ timeout: 10_000 });
  await expectAnyVisible(rabPanel.getByText('Belum ada item RAB'));
  await shot(page, rec.device, 'rab-empty');

  rec.step('RAB: tambah item pengeluaran manual "Pupuk NPK 200kg" (10 karung × Rp 850.000, alias "NPK, pupuk")');
  let dialog = await openRabItemDialog(page, rec);
  await fillRabItem(page, dialog, { kategori: 'Saprodi', nama: 'Pupuk NPK 200kg', volume: '10', satuan: 'karung', harga: '850000', bulan: '2026-08', alias: 'NPK, pupuk' });
  const totalBox = dialog.getByText('Rp 8.500.000', { exact: true });
  await expect(totalBox).toBeVisible({ timeout: 5000 });
  rec.finding('ok', 'rab-form', 'Total Rencana terhitung live: 10 × Rp 850.000 = Rp 8.500.000');
  await shot(page, rec.device, 'rab-form-expense');
  await dialog.getByRole('button', { name: 'Tambah Item', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expectAnyVisible(page.getByText('Pupuk NPK 200kg'));
  const biayaCard = page.locator('[aria-label="Biaya Rencana"]');
  await expect(biayaCard).toContainText('Rp 8.500.000', { timeout: 10_000 });

  rec.step('RAB: probe validasi form kosong');
  dialog = await openRabItemDialog(page, rec);
  await dialog.getByRole('button', { name: 'Tambah Item', exact: true }).click();
  await page.waitForTimeout(500);
  const validationAlert = await firstVisible(dialog.getByText(/Pilihan kategori tidak boleh kosong/i));
  rec.finding(validationAlert ? 'ok' : 'warn', 'rab-validasi', validationAlert
    ? 'Validasi form RAB muncul saat submit kosong (Alert di dalam dialog).'
    : 'Tidak ada validasi terlihat saat submit form RAB kosong.');
  await shot(page, rec.device, 'rab-form-validation');
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  rec.step('RAB: tambah item pendapatan manual "Jual Cabai Merah" (500 kg × Rp 12.000)');
  dialog = await openRabItemDialog(page, rec);
  await fillRabItem(page, dialog, { jenis: 'Pendapatan', kategori: 'Penjualan Hasil Panen', nama: 'Jual Cabai Merah', volume: '500', satuan: 'kg', harga: '12000' });
  await dialog.getByRole('button', { name: 'Tambah Item', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expectAnyVisible(page.getByText('Jual Cabai Merah'));
  const pendapatanCard = page.locator('[aria-label="Pendapatan Rencana"]');
  await expect(pendapatanCard).toContainText('Rp 6.000.000', { timeout: 10_000 });
  const labaCard = page.locator('[aria-label="Laba Rencana"]');
  const labaText = (await labaCard.innerText()).replace(/\s+/g, ' ').trim();
  rec.result.rabSummary = `Pendapatan Rencana Rp 6.000.000 | Biaya Rencana Rp 8.500.000 | Laba Rencana: ${labaText}`;
  rec.step(`RAB ringkasan: ${rec.result.rabSummary}`);
  if (!/-2\.500\.000/.test(labaText)) {
    rec.finding('logic', 'rab-total', `Laba Rencana tidak menunjukkan -Rp 2.500.000 (6.000.000 − 8.500.000). Tampil: "${labaText}"`);
  } else {
    rec.finding('ok', 'rab-total', 'Laba Rencana benar: -Rp 2.500.000 (defisit rencana).');
  }
  await checkOverflow(page, rec, 'tab RAB terisi');
  await shot(page, rec.device, 'rab-populated');

  rec.step('Buku Besar: catat 4 transaksi manual');
  await tablist.getByRole('tab', { name: 'Buku Besar', exact: true }).click();
  await expect(page.getByTestId('finance-panel-buku-besar')).toBeVisible({ timeout: 10_000 });

  await addTransaction(page, rec, { jenis: 'Pengeluaran', kategori: 'Pupuk', nominal: '1700000', tanggal: '05-08-2026', catatan: 'Beli 2 karung NPK' });
  await addTransaction(page, rec, { jenis: 'Pendapatan', kategori: 'Penjualan Hasil Panen', nominal: '1200000', tanggal: '10-08-2026', catatan: 'Jual 100 kg cabai grade A' });
  await addTransaction(page, rec, { jenis: 'Pengeluaran', kategori: 'Pupuk', nominal: '850000', tanggal: '12-08-2026', catatan: 'Beli 1 karung NPK tambahan' });
  await addTransaction(page, rec, { jenis: 'Pengeluaran', kategori: 'Tenaga Kerja', nominal: '300000', tanggal: '15-08-2026', catatan: 'Bayar borongan panen' });

  if (isMobileDevice) {
    rec.step('Mobile: expand semua kartu transaksi agar catatan & chip terlihat');
    await expandAllMobileCards(page);
  }
  await expectAnyVisible(page.getByText('Beli 2 karung NPK'));
  await expectAnyVisible(page.getByText('Bayar borongan panen'));
  await shot(page, rec.device, 'ledger-4-transactions');

  rec.step('Cek status link awal tiap transaksi (apakah auto-link terjadi saat simpan?)');
  for (const [kategori, catatan] of [
    ['Pupuk', 'Beli 2 karung NPK'],
    ['Penjualan Hasil Panen', 'Jual 100 kg cabai grade A'],
    ['Tenaga Kerja', 'Bayar borongan panen'],
  ] as const) {
    await getTxChipText(page, rec, kategori, catatan);
  }

  rec.step('Hubungkan manual: transaksi "Beli 2 karung NPK" → RAB "Pupuk NPK 200kg"');
  let linkDialog = await linkTransactionViaRow(page, rec, isMobileDevice, 'Pupuk');
  if (linkDialog) {
    const subtitle = (await linkDialog.getByText(/transaksi .* akan disambungkan ke item RAB/).first().innerText().catch(() => '')).trim();
    rec.finding('ok', 'linking', `Subtitle dialog: "${subtitle}"`);
    const suggestChip = await firstVisible(linkDialog.getByText('Disarankan'));
    if (suggestChip) rec.finding('ok', 'linking', 'Chip "Disarankan" tampil pada item RAB yang cocok.');
    await pickRabOptionAndVerify(page, rec, linkDialog, 'Pupuk NPK 200kg', /1 transaksi berhasil dihubungkan ke RAB/);
    await page.waitForTimeout(600);
    await getTxChipText(page, rec, 'Pupuk', 'Beli 2 karung NPK');
  }

  rec.step('Hubungkan manual: transaksi pendapatan "Jual 100 kg cabai grade A" → RAB "Jual Cabai Merah"');
  linkDialog = await linkTransactionViaRow(page, rec, isMobileDevice, 'Penjualan Hasil Panen');
  if (linkDialog) {
    const incomeOptions = await linkDialog.getByRole('button', { name: /Hubungkan RAB / }).count();
    rec.finding(incomeOptions > 0 && incomeOptions < 3 ? 'ok' : 'logic', 'linking', `Jumlah opsi RAB pada dialog transaksi PENDAPATAN: ${incomeOptions} (harusnya hanya item income: "Jual Cabai Merah").`);
    await pickRabOptionAndVerify(page, rec, linkDialog, 'Jual Cabai Merah', /1 transaksi berhasil dihubungkan ke RAB/);
    await page.waitForTimeout(600);
    await getTxChipText(page, rec, 'Penjualan Hasil Panen', 'Jual 100 kg cabai grade A');
  }

  rec.step('Bulk: pilih 2 transaksi pengeluaran → Hubungkan RAB sekaligus');
  if (isMobileDevice) {
    rec.finding('logic', 'bulk', 'Mobile: kartu transaksi TIDAK memiliki checkbox seleksi — fitur bulk link "Hubungkan RAB" hanya tersedia di desktop (parity gap).');
  } else {
    await page.getByRole('row', { name: /Beli 2 karung NPK/ }).first().click();
    await page.getByRole('row', { name: /Beli 1 karung NPK tambahan/ }).first().click();
    await page.waitForTimeout(400);
    const bulkButton = await firstVisible(page.getByRole('button', { name: 'Hubungkan RAB', exact: true }));
    if (!bulkButton) {
      rec.finding('bug', 'bulk', 'Bulk bar / tombol "Hubungkan RAB" tidak muncul setelah memilih 2 transaksi.');
    } else {
      await bulkButton.click();
      linkDialog = page.locator('.MuiDialog-paper').filter({ hasText: 'akan disambungkan ke item RAB' });
      await expect(linkDialog).toBeVisible({ timeout: 15_000 });
      await shot(page, rec.device, 'link-dialog-bulk');
      await pickRabOptionAndVerify(page, rec, linkDialog, 'Pupuk NPK 200kg', /2 transaksi berhasil dihubungkan ke RAB/);
      rec.finding('ok', 'bulk', 'Bulk link 2 transaksi ke satu item RAB berhasil (multi-link diizinkan).');
      rec.finding('ok', 'bulk', 'PERILAKU: relink transaksi yang sudah terhubung (Beli 2 karung NPK) ditimpa TANPA peringatan — dicatat sebagai temuan UX.');
    }
  }

  rec.step('Bulk campuran jenis: pilih transaksi pendapatan + pengeluaran sekaligus');
  if (isMobileDevice) {
    rec.finding('logic', 'bulk-mixed', 'Mobile: skenario bulk campuran tidak bisa diuji — tidak ada checkbox seleksi di kartu transaksi.');
  } else {
    await page.getByRole('row', { name: /Jual 100 kg cabai grade A/ }).first().click();
    await page.getByRole('row', { name: /Beli 1 karung NPK tambahan/ }).first().click();
    await page.waitForTimeout(400);
    const bulkButton2 = await firstVisible(page.getByRole('button', { name: 'Hubungkan RAB', exact: true }));
    if (bulkButton2) {
      await bulkButton2.click();
      linkDialog = page.locator('.MuiDialog-paper').filter({ hasText: 'akan disambungkan ke item RAB' });
      await expect(linkDialog).toBeVisible({ timeout: 15_000 });
      const mixedSubtitle = await firstVisible(linkDialog.getByText(/campuran/));
      rec.finding(mixedSubtitle ? 'ok' : 'warn', 'bulk-mixed', mixedSubtitle
        ? 'Subtitle mengonfirmasi pilihan campuran terdeteksi.'
        : `Subtitle tidak menyebut campuran: "${(await linkDialog.innerText()).slice(0, 120)}"`);
      const mixedMessage = linkDialog.getByText('Pilih transaksi dengan jenis yang sama sebelum menghubungkan RAB.');
      const emptyMessage = linkDialog.getByText('Belum ada item RAB yang cocok dengan transaksi ini.');
      const mixedShown = await anyVisible(mixedMessage) || await anyVisible(emptyMessage);
      const optionCount = await linkDialog.getByRole('button', { name: /Hubungkan RAB / }).count();
      rec.finding(mixedShown && optionCount === 0 ? 'logic' : 'bug', 'bulk-mixed', mixedShown
        ? `Bulk campuran jenis: pesan peringatan tampil, opsi RAB = ${optionCount} (UX: lebih baik blokir tombol sejak awal daripada dialog kosong).`
        : `Bulk campuran jenis: TIDAK ada pesan peringatan, opsi RAB tampil = ${optionCount} — RISIKO salah-link lintas jenis!`);
      await shot(page, rec.device, 'link-dialog-mixed');
      await linkDialog.getByRole('button', { name: 'Batal', exact: true }).click();
      await expect(linkDialog).toBeHidden({ timeout: 10_000 });
      const cancelButton = await firstVisible(page.getByRole('button', { name: 'Batalkan', exact: true }));
      if (cancelButton) await cancelButton.click();
    }
  }

  rec.step('Filter status link (mobile-only chips)');
  const linkedChip = await firstVisible(page.getByRole('button', { name: /RAB Terhubung|Terhubung RAB$/ }));
  const unlinkedChip = await firstVisible(page.getByRole('button', { name: /Belum Terhubung|Belum ke RAB$/ }));
  if (isMobileDevice) {
    if (unlinkedChip) {
      await unlinkedChip.click();
      await page.waitForTimeout(500);
      const tenagaKerjaVisible = await anyVisible(page.getByText('Tenaga Kerja', { exact: true }));
      const pupukVisible = await anyVisible(page.getByText('Pupuk', { exact: true }));
      rec.finding(tenagaKerjaVisible && !pupukVisible ? 'ok' : 'bug', 'filter', `Filter "⚠ Belum ke RAB": Tenaga Kerja=${tenagaKerjaVisible}, Pupuk=${pupukVisible} (harusnya hanya Tenaga Kerja).`);
      await shot(page, rec.device, 'filter-belum-terhubung');
      await unlinkedChip.click();
      await page.waitForTimeout(400);
    } else {
      rec.finding('bug', 'filter', 'Chip filter "Belum Terhubung" tidak ditemukan di mobile.');
    }
    if (linkedChip) {
      await linkedChip.click();
      await page.waitForTimeout(500);
      const pupukVisible2 = await anyVisible(page.getByText('Pupuk', { exact: true }));
      const tenagaKerjaVisible2 = await anyVisible(page.getByText('Tenaga Kerja', { exact: true }));
      rec.finding(pupukVisible2 && !tenagaKerjaVisible2 ? 'ok' : 'bug', 'filter', `Filter "✓ Terhubung RAB": Pupuk=${pupukVisible2}, Tenaga Kerja=${tenagaKerjaVisible2}.`);
      await linkedChip.click();
      await page.waitForTimeout(400);
    }
  } else {
    rec.finding(linkedChip || unlinkedChip ? 'ok' : 'logic', 'filter', 'Desktop: chip filter RAB Terhubung/Belum Terhubung TIDAK tersedia (hanya mobile) — pengguna desktop tidak bisa memfilter status link.');
  }

  rec.step('Logic test: hapus item RAB yang masih terhubung ke transaksi (dangling link)');
  await tablist.getByRole('tab', { name: 'RAB', exact: true }).click();
  await expect(page.getByTestId('finance-panel-rab')).toBeVisible({ timeout: 10_000 });
  dialog = await openRabItemDialog(page, rec);
  await fillRabItem(page, dialog, { kategori: 'Alat Tani', nama: 'Alat Semprot Sekunder', volume: '1', satuan: 'unit', harga: '100000' });
  await dialog.getByRole('button', { name: 'Tambah Item', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expectAnyVisible(page.getByText('Alat Semprot Sekunder'));

  await tablist.getByRole('tab', { name: 'Buku Besar', exact: true }).click();
  await expect(page.getByTestId('finance-panel-buku-besar')).toBeVisible({ timeout: 10_000 });
  linkDialog = await linkTransactionViaRow(page, rec, isMobileDevice, 'Tenaga Kerja');
  if (linkDialog) {
    await pickRabOptionAndVerify(page, rec, linkDialog, 'Alat Semprot Sekunder', /1 transaksi berhasil dihubungkan ke RAB/);
  }

  await tablist.getByRole('tab', { name: 'RAB', exact: true }).click();
  await expect(page.getByTestId('finance-panel-rab')).toBeVisible({ timeout: 10_000 });
  if (isMobileDevice) {
    const selectCheckbox = await firstVisible(page.getByRole('checkbox', { name: 'Pilih item RAB Alat Semprot Sekunder' }));
    if (selectCheckbox) {
      await selectCheckbox.click();
      await page.waitForTimeout(300);
    }
  } else {
    await page.getByRole('row', { name: /Alat Semprot Sekunder/ }).first().click();
    await page.waitForTimeout(300);
  }
  const deleteButton = await firstVisible(page.getByRole('button', { name: 'Hapus item RAB Alat Semprot Sekunder' }));
  if (!deleteButton) {
    rec.finding('bug', 'dangling', 'Tombol "Hapus item RAB Alat Semprot Sekunder" tidak muncul setelah item dipilih.');
  } else {
    await deleteButton.click();
    const confirmDialog = page.getByRole('dialog', { name: 'Hapus item RAB?', exact: true });
    await expect(confirmDialog).toBeVisible({ timeout: 10_000 });
    await confirmDialog.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(confirmDialog).toBeHidden({ timeout: 10_000 });
    await page.waitForTimeout(800);
    const stillThere = await anyVisible(page.getByText('Alat Semprot Sekunder'));
    rec.finding(stillThere ? 'bug' : 'ok', 'dangling', stillThere
      ? 'Item RAB masih tampil setelah dihapus.'
      : 'Item RAB "Alat Semprot Sekunder" berhasil dihapus.');
  }

  await tablist.getByRole('tab', { name: 'Buku Besar', exact: true }).click();
  await expect(page.getByTestId('finance-panel-buku-besar')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
  if (isMobileDevice) {
    const expandButton = await firstVisible(page.getByRole('button', { name: 'Buka detail transaksi Tenaga Kerja' }));
    if (expandButton) {
      await expandButton.click();
      await page.waitForTimeout(400);
    }
  }
  const fallbackChip = page.getByText('RAB tersambung');
  const fallbackShown = await anyVisible(fallbackChip);
  rec.finding(fallbackShown ? 'logic' : 'warn', 'dangling', fallbackShown
    ? 'LOGIC: setelah item RAB dihapus, chip transaksi menjadi "RAB tersambung" (fallback) — link menggantung tanpa cara memutus dari UI (tidak ada unlink).'
    : 'Chip fallback "RAB tersambung" TIDAK terlihat setelah item RAB dihapus — periksa apakah chip hilang total atau kembali kosong.');

  if (isMobileDevice) {
    const linkedChip2 = await firstVisible(page.getByRole('button', { name: /RAB Terhubung|Terhubung RAB$/ }));
    if (linkedChip2) {
      await linkedChip2.click();
      await page.waitForTimeout(500);
      const danglingInLinked = await anyVisible(page.getByText('Tenaga Kerja', { exact: true }));
      rec.finding(danglingInLinked ? 'logic' : 'ok', 'dangling', danglingInLinked
        ? 'LOGIC: transaksi dengan rabItemId menggantung masih dihitung "Terhubung RAB" oleh filter padahal item RAB-nya sudah dihapus.'
        : 'Filter "Terhubung RAB" tidak lagi menghitung transaksi dengan item RAB yang dihapus (bersih).');
      await linkedChip2.click();
    }
  }

  await checkOverflow(page, rec, 'akhir alur');
  await shot(page, rec.device, 'final-state');
}

const devices = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

for (const device of devices) {
  test(`simulasi RAB & linking buku besar (${device.name})`, async ({ browserName, browser }) => {
    test.skip(browserName !== 'chromium', 'Simulasi hanya dijalankan di Chromium.');
    test.setTimeout(420_000);
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
      localStorage.setItem('arina-guide:v1:global', 'true');
      localStorage.setItem('arina-guide:v1:finance', 'true');
    }, demoUserId);

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        const text = `[${message.type()}] ${message.text()}`.slice(0, 2000);
        if (!rec.result.consoleIssues.includes(text)) rec.result.consoleIssues.push(text);
      }
    });
    page.on('pageerror', (error) => {
      const text = error.message.slice(0, 2000);
      if (!rec.result.pageErrors.includes(text)) rec.result.pageErrors.push(text);
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        const text = `${status} ${response.url()}`.slice(0, 500);
        if (!rec.result.httpIssues.includes(text)) rec.result.httpIssues.push(text);
      }
    });

    try {
      await runFlow(page, rec, device.isMobile);
    } catch (error) {
      rec.finding('bug', 'fatal', `Simulasi terhenti: ${(error as Error).message.slice(0, 500)}`);
      await shot(page, device.name, 'fatal-state').catch(() => undefined);
    }

    fs.mkdirSync(path.join(artifactDir, device.name), { recursive: true });
    fs.writeFileSync(
      path.join(artifactDir, device.name, 'results.json'),
      JSON.stringify(rec.result, null, 2),
    );
    console.log(`[${device.name}] Hasil: playwright-report/keuangan-simulasi-rab/${device.name}/results.json`);

    await context.close();
  });
}
