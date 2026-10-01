/**
 * Simulasi "petani pertama kali" untuk fitur MANAJENEN KEUANGAN.
 *
 * Persona: petani padi 1 Ha, tidak acquainted dengan istilah produk/financial.
 * Sumber data nyata: references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx
 *
 * Ground truth (dihitung dari SELURUH isi file; sheet RAB punya 989 baris):
 *   Item RAB    : 22 = Saprodi 7 + Jasa Alsintan 4 + Tenaga Kerja 7
 *                        + Biaya Tetap 1 + Lain-lain 2 + Penerimaan 1 (income)
 *   Transaksi   : 37 dari "Catatan Transaksi Harian" + 1 disuntik importer (Sewa lahan)
 *   Pengeluaran : Rp 22.159.000  (ledger 15.159.000 + Sewa Lahan 7.000.000)
 *   Pemasukan   : Rp 45.500.000  (Penjualan gabah kering GKP)
 *   Laba / Rugi : Rp 23.341.000
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const XLSX = 'references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx';
const OUT = path.join(process.cwd(), '.tmp', 'keuangan-petani');
fs.mkdirSync(OUT, { recursive: true });

const EXPECT = {
  items: 22,
  transactions: 38,
  totalPengeluaran: 22159000,
  totalPemasukan: 45500000,
  labaRugi: 23341000,
};

const log = [];
const findings = [];
const consoleIssues = [];
const pageErrors = [];
const httpIssues = [];
let shotN = 0;

const L = (s) => { log.push(s); console.log(s); };
const F = (sev, area, detail) => {
  findings.push({ sev, area, detail });
  console.log(`${sev.toUpperCase().padEnd(4)} [${area}] ${detail}`);
};

async function shot(page, name, full = false) {
  shotN += 1;
  const file = path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: full });
  return file;
}

async function firstVisible(loc) {
  const n = await loc.count();
  for (let i = 0; i < n; i += 1) {
    if (await loc.nth(i).isVisible().catch(() => false)) return loc.nth(i);
  }
  return null;
}

async function anyVisible(loc) {
  const n = await loc.count();
  for (let i = 0; i < n; i += 1) if (await loc.nth(i).isVisible().catch(() => false)) return true;
  return false;
}

const text = (page) => page.evaluate(() => document.body.innerText);

function rp(str) {
  const m = /Rp\s?([\d.,]+)/.exec(String(str || '').replace(/\u00a0/g, ' '));
  if (!m) return null;
  return Number(m[1].replace(/\./g, '').replace(/,/g, '.'));
}

/** Ambil teks kartu ringkasan Total Pemasukan / Total Pengeluaran / Estimasi Laba Bersih */
async function readSummaryCards(page) {
  return page.evaluate(() => {
    const out = {};
    for (const label of ['Total Pemasukan', 'Total Pengeluaran', 'ESTIMASI LABA BERSIH']) {
      const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
      const card = cards.find((c) => (c.innerText || '').includes(label));
      if (card) out[label] = (card.innerText || '').replace(/\s+/g, ' ').trim();
    }
    return out;
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'id-ID' });
const page = await ctx.newPage();

page.on('console', (m) => {
  const t = m.text();
  if (t.includes('webpack-hmr') || t.includes('React DevTools') || t.includes('[HMR]') || t.includes('Supabase Debug')) return;
  if (m.type() === 'error' || m.type() === 'warning') {
    const s = `[${m.type()}] ${t}`.slice(0, 400);
    if (!consoleIssues.includes(s)) consoleIssues.push(s);
  }
});
page.on('pageerror', (e) => { const s = e.message.slice(0, 400); if (!pageErrors.includes(s)) pageErrors.push(s); });
page.on('response', (r) => {
  if (r.status() >= 400) { const s = `${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`.slice(0, 300); if (!httpIssues.includes(s)) httpIssues.push(s); }
});

try {
  // ============================================================ LANGKAH 1
  L('\n############ LANGKAH 1 — Petani membuka aplikasi untuk pertama kali ############');
  await page.goto(BASE + '/login', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: /Masuk sebagai Tamu/i }).click();
  for (let i = 0; i < 25 && !page.url().includes('/dashboard'); i += 1) await page.waitForTimeout(400);
  L('URL: ' + page.url());
  await page.waitForTimeout(6000);
  // tutup guide kalau muncul
  const lewati = page.getByRole('button', { name: 'Lewati', exact: true });
  if (await lewati.isVisible({ timeout: 6000 }).catch(() => false)) {
    L('  guide onboarding muncul -> ditutup lewat tombol "Lewati"');
    await lewati.click().catch(() => {});
    await page.waitForTimeout(1500);
  }

  // ============================================================ LANGKAH 2
  L('\n############ LANGKAH 2 — Petani mencari menu "Keuangan" ############');
  L('  Tulisan yang dilihat di sidebar: ' + (await text(page)).replace(/\n+/g, ' | ').slice(0, 320));
  const nav = page.locator('[data-guide-target="nav-keuangan"]').first();
  await nav.click({ timeout: 10_000 });
  await page.waitForTimeout(5000);
  L('  URL: ' + page.url());
  const firstVisit = await text(page);
  L('\n  ISI HALAMAN KEUANGAN (kunjungan pertama):\n' + firstVisit.replace(/\n+/g, ' | '));
  await shot(page, 'keuangan-kunjungan-pertama', true);

  const jargon = ['RAB', 'Laba Rugi', 'Arus Kas', 'Perbandingan', 'Skenario', 'Proyeksi', 'Realisasi', 'BEP', 'HPP', 'Asumsi', 'Financing'];
  const foundJargon = jargon.filter((j) => firstVisit.includes(j));
  F('warn', 'istilah', `Halaman pertama memuat ${foundJargon.length} istilah keuangan tanpa penjelasan: ${foundJargon.join(', ')}. Petani baru tidak akan tahu mana yang harus dipakai duluan.`);

  // ============================================================ LANGKAH 3
  L('\n############ LANGKAH 3 — Petani mencoba tombol sebelum punya data ############');
  for (const btnName of ['Catat Transaksi', 'Export Excel', 'Export Laporan']) {
    const b = await firstVisible(page.getByRole('button', { name: new RegExp(`^${btnName}`, 'i') }));
    if (!b) { L(`  "${btnName}": TIDAK DITEMUKAN`); continue; }
    const disabled = await b.isDisabled();
    L(`  "${btnName}": disabled=${disabled}`);
    if (!disabled) {
      await b.click({ timeout: 8000 }).catch((e) => L('    ERR klik: ' + e.message.split('\n')[0]));
      await page.waitForTimeout(2500);
      const bodyNow = await text(page);
      const warned = /Buat atau pilih proyek terlebih dahulu|Buat proyek terlebih dahulu/i.test(bodyNow);
      L(`    -> setelah diklik: ada peringatan? ${warned}`);
      F(warned ? 'ok' : 'BUG', 'guard', `Tombol "${btnName}" tanpa proyek: ${disabled ? 'benar-benar disabled' : warned ? 'memunculkan peringatan yang jelas' : 'diklik tanpa efek DAN tanpa peringatan'}`);
      if (await page.getByRole('dialog').count()) { await shot(page, `klik-${btnName.replace(/\s/g, '-')}`); await page.keyboard.press('Escape'); await page.waitForTimeout(800); }
    } else {
      F('ok', 'guard', `Tombol "${btnName}" disabled sebelum ada proyek — benar.`);
    }
  }

  // ============================================================ LANGKAH 4
  L('\n############ LANGKAH 4 — Petani membuat proyek pertama ############');
  const buatProyek = await firstVisible(page.getByRole('button', { name: 'Buat Proyek', exact: true }));
  if (!buatProyek) throw new Error('Tombol Buat Proyek tidak ditemukan');
  await buatProyek.click();
  const projDlg = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
  await projDlg.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(600);

  const submitProj = projDlg.getByRole('button', { name: 'Buat Proyek', exact: true });
  const emptyDisabled = await submitProj.isDisabled();
  L('  submit form kosong disabled? ' + emptyDisabled);
  F(emptyDisabled ? 'ok' : 'warn', 'validasi-form', emptyDisabled
    ? 'Tombol "Buat Proyek" disabled saat form kosong.'
    : 'Tombol "Buat Proyek" TIDAK disabled saat form kosong — risiko proyek kosong tersimpan.');
  if (!emptyDisabled) { await submitProj.click().catch(() => {}); await page.waitForTimeout(1200); }

  // Petani menyalin judul dari Excel-nya sendiri
  await projDlg.getByRole('textbox', { name: /^Nama Proyek/ }).fill('USAHATANI PADI 1 HA');
  await projDlg.getByRole('textbox', { name: 'Lokasi / Blok Lahan' }).fill('Blok A');
  await projDlg.getByRole('textbox', { name: /^Komoditas Utama/ }).fill('Padi');
  await projDlg.getByRole('textbox', { name: 'Label Musim Tanam', exact: true }).fill('MT 3 (AGUSTUS - DESEMBER 2026)');
  await projDlg.getByRole('textbox', { name: 'Tanggal Mulai', exact: true }).fill('01-08-2026');
  await projDlg.getByRole('textbox', { name: 'Tanggal Selesai', exact: true }).fill('31-12-2026');
  await shot(page, 'buat-proyek-terisi');
  await submitProj.click();
  await projDlg.waitFor({ state: 'hidden', timeout: 20_000 });
  await page.waitForTimeout(3000);
  L('  proyek dibuat. Dipilih otomatis? ' + (await anyVisible(page.getByRole('combobox').filter({ hasText: /USAHATANI PADI 1 HA/ }))));
  await shot(page, 'setelah-buat-proyek', true);

  // ============================================================ LANGKAH 5
  L('\n############ LANGKAH 5 — Petani mengunggah file Excel-nya sendiri ############');
  const importBtn = await firstVisible(page.getByRole('button', { name: /Import Excel/i }));
  if (!importBtn) throw new Error('Tombol Import Excel tidak ditemukan');
  await importBtn.click();
  const impDlg = page.locator('[role="dialog"]').filter({ has: page.locator('input[type=file]') }).first();
  await impDlg.waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(800);
  L('  isi dialog: ' + (await text(page)).replace(/\n+/g, ' | ').slice(-700));
  await shot(page, 'import-dialog-awal');

  // Cek: apakah app menjelaskan format file yang diharapkan?
  const dialogText = await page.locator('[role="dialog"]').first().innerText();
  const explainsFormat = /kolom|header|contoh|template|format|struktur/i.test(dialogText);
  F(explainsFormat ? 'ok' : 'warn', 'import-ux', explainsFormat
    ? 'Dialog import menjelaskan sesuatu tentang format/struktur file.'
    : 'Dialog import TIDAK menjelaskan format file yang diharapkan (kolom apa saja, nama sheet, contoh template). Petani hanya diberi "Klik atau seret file .xlsx" — tidak tahu file-nya harus seperti apa.');

  // Pilih skenario tujuan
  const scenarioSelect = impDlg.getByRole('combobox', { name: 'Target Mode Skenario' });
  L('  scenario default: ' + JSON.stringify(await scenarioSelect.inputValue().catch(() => 'n/a')));
  await scenarioSelect.click();
  await page.waitForTimeout(700);
  const opts = await page.getByRole('option').allInnerTexts();
  L('  pilihan skenario: ' + JSON.stringify(opts));
  await page.getByRole('option', { name: 'Rencana (Proyeksi)', exact: true }).click().catch(async () => {
    await page.getByRole('option').first().click();
  });
  await page.waitForTimeout(600);

  await impDlg.locator('input[type=file]').setInputFiles(XLSX);
  await page.waitForTimeout(900);
  L('  file terbaca: ' + (await impDlg.innerText()).includes('CATATAN KEUANGAN PADI'));
  await shot(page, 'import-file-terpilih');

  L('  klik "Lanjutkan Impor" ...');
  await page.getByRole('button', { name: /Lanjutkan Impor/i }).click();
  await page.waitForTimeout(6000);
  await page.waitForTimeout(2000);

  // ============================================================ LANGKAH 6
  L('\n############ LANGKAH 6 — Pratinjau & rekonsiliasi (tahap sebelum simpan) ############');
  const preflightText = await text(page);
  L('  TULISAN PRATINJAU:\n' + preflightText.replace(/\n+/g, ' | ').slice(-1800));
  await shot(page, 'import-pratinjau', true);

  const infoMatch = /Ditemukan\s+(\d+)\s+item RAB\s+dan\s+(\d+)\s+transaksi/i.exec(preflightText.replace(/\s+/g, ' '));
  if (infoMatch) {
    const items = Number(infoMatch[1]);
    const txs = Number(infoMatch[2]);
    L(`  items=${items} (harapan ${EXPECT.items}) | transaksi=${txs} (harapan ${EXPECT.transactions})`);
    F(items === EXPECT.items ? 'ok' : 'BUG', 'import-akurasi', `Jumlah item RAB terbaca ${items}, harapan ${EXPECT.items}.`);
    F(txs === EXPECT.transactions ? 'ok' : 'BUG', 'import-akurasi', `Jumlah transaksi terbaca ${txs}, harapan ${EXPECT.transactions}.`);
  } else {
    F('BUG', 'import-ux', 'Ringkasan "Ditemukan N item RAB dan M transaksi" tidak ditemukan di pratinjau.');
  }

  const reconRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr')).map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim());
    return rows;
  });
  L('  tabel rekonsiliasi: ' + JSON.stringify(reconRows));
  const nonZeroRecon = reconRows.filter((r) => /Rp\s?-?\d/.test(r) && !/Rp ?0$/.test(r) && r.split('Rp').length > 4);
  F(nonZeroRecon.length === 0 ? 'ok' : 'warn', 'import-akurasi', nonZeroRecon.length === 0
    ? 'Rekonsiliasi per kelompok biaya: semua selisih Rp 0 — total kategori cocok dengan Excel.'
    : `Rekonsiliasi menemukan selisih: ${nonZeroRecon.join(' ;; ')}`);

  const warned = /Catatan untuk diperhatikan/i.test(preflightText);
  F('warn', 'import-ux', warned
    ? 'Pratinjau MEMUNCUKKAN catatan peringatan — perlu dibaca apakah membingungkan.'
    : 'Pratinjau tidak menampilkan catatan apa pun.');
  await shot(page, 'import-pratinjau-detail', true);

  // ============================================================ LANGKAH 7
  L('\n############ LANGKAH 7 — Petani menyimpan hasil import ############');
  await page.getByRole('button', { name: /Konfirmasi & Simpan ke Sistem/i }).click();
  await page.waitForTimeout(9000);
  await page.waitForTimeout(3000);
  const summaryText = await text(page);
  L('  RINGKASAN HASIL IMPORT:\n' + summaryText.replace(/\n+/g, ' | ').slice(-1200));
  await shot(page, 'import-hasil', true);

  const sums = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.MuiCard-root').forEach((c) => {
      const t = (c.innerText || '').replace(/\s+/g, ' ').trim();
      const m = /^(Item RAB Dibuat|Transaksi Dicatat|Baris Dilewati)\s+(\d+)$/.exec(t);
      if (m) out[m[1]] = Number(m[2]);
    });
    return out;
  });
  L('  angka hasil import: ' + JSON.stringify(sums));
  if (sums['Transaksi Dicatat'] !== undefined) {
    F(sums['Transaksi Dicatat'] === EXPECT.transactions ? 'ok' : 'BUG', 'import-akurasi',
      `Transaksi tersimpan ${sums['Transaksi Dicatat']}, harapan ${EXPECT.transactions}.`);
  }
  if (sums['Baris Dilewati'] !== undefined) {
    F('warn', 'import-ux', `Summary melaporkan "${sums['Baris Dilewati']} baris dilewati" TAPI tidak menampilkan baris mana yang dilewati atau alasannya. Petani tidak bisa memverifikasi apakah ada data-important yang hilang.`);
  }

  await page.getByRole('button', { name: /^Selesai$/ }).click().catch(() => {});
  await page.waitForTimeout(4000);

  // ============================================================ LANGKAH 8
  L('\n############ LANGKAH 8 — Petani membandingkan hasil app dengan Excel-nya ############');
  const cards = await readSummaryCards(page);
  L('  kartu ringkasan di Buku Besar: ' + JSON.stringify(cards, null, 1));
  const masuk = rp(cards['Total Pemasukan']);
  const keluar = rp(cards['Total Pengeluaran']);
  const laba = rp(cards['ESTIMASI LABA BERSIH']);
  L(`  parsed -> pemasukan=${masuk} pengeluaran=${keluar} laba=${laba}`);
  F(masuk === EXPECT.totalPemasukan ? 'ok' : 'BUG', 'akurasi-angka',
    `Total Pemasukan app ${masuk} vs Excel ${EXPECT.totalPemasukan} (${masuk === EXPECT.totalPemasukan ? 'cocok' : 'TIDAK COCOK'}).`);
  F(keluar === EXPECT.totalPengeluaran ? 'ok' : 'BUG', 'akurasi-angka',
    `Total Pengeluaran app ${keluar} vs Excel ${EXPECT.totalPengeluaran} (${keluar === EXPECT.totalPengeluaran ? 'cocok' : 'selisih ' + (keluar - EXPECT.totalPengeluaran)})`);
  F(laba === EXPECT.labaRugi ? 'ok' : 'BUG', 'akurasi-angka',
    `Estimasi Laba Bersih app ${laba} vs Laba/Rugi Excel ${EXPECT.labaRugi} (${laba === EXPECT.labaRugi ? 'cocok' : 'selisih ' + (laba - EXPECT.labaRugi)})`);
  await shot(page, 'buku-besar-terisi', true);

  // Cari transaksi yg disuntikkan otomatis
  L('\n  -- mencari transaksi yang tidak ada di Excel (disuntikkan importer) --');
  const allRows = await page.evaluate(() => Array.from(document.querySelectorAll('table tbody tr')).map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()));
  L('  jumlah baris tabel: ' + allRows.length);
  const injected = allRows.filter((r) => /Sewa lahan/i.test(r));
  L('  baris "Sewa lahan": ' + JSON.stringify(injected));
  F(injected.length > 0 ? 'warn' : 'ok', 'import-transparansi', injected.length > 0
    ? `Importer MENYUNTIKKAN transaksi "Sewa lahan" Rp 7.000.000 yang tidak ada di Excel Petani, tanpa penjelasan di dialog. Tanggalnya disamakan dengan transaksi pertama. Petani akan bingung:"dari mana transactions ini?"`
    : 'Tidak ada transaksi suntikan yang tidak ter unsweetened.');

  // ============================================================ LANGKAH 9
  L('\n############ LANGKAH 9 — Petani menelusuri tiap tab laporan ############');
  const tablist = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' });
  const tabs = [['Buku Besar', 'finance-panel-buku-besar'], ['RAB', 'finance-panel-rab'], ['Laba Rugi', 'finance-panel-laba-rugi'], ['Arus Kas', 'finance-panel-arus-kas'], ['Arus Kas Pasca Pembiayaan', 'finance-panel-arus-kas-pasca-pembiayaan'], ['Perbandingan', 'finance-panel-perbandingan']];
  for (const [label, testid] of tabs) {
    await tablist.getByRole('tab', { name: label, exact: true }).click();
    await page.waitForTimeout(2200);
    const panel = page.getByTestId(testid);
    const visible = await panel.isVisible().catch(() => false);
    const inner = visible ? (await panel.innerText()).replace(/\s+/g, ' ').trim() : '(panel tidak tampil)';
    L(`\n  --- ${label} (visible=${visible}) ---\n  ${inner.slice(0, 1100)}`);
    await shot(page, `tab-${label.replace(/\s/g, '-')}`, true);

    const empty = /belum ada|tidak ada data|kosong|belum terisi/i.test(inner);
    F(!empty ? 'ok' : 'warn', 'laporan', `${label}: ${empty ? 'panel kosong / hanya empty state — ada data hasil import tapi tidak muncul.' : 'terisi data.'}`);

    // cek overflow
    const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    if (ov.sw > ov.iw + 1) F('BUG', 'layout', `Tab ${label}: horizontal overflow (${ov.sw} > ${ov.iw}).`);
  }

  // ============================================================ LANGKAH 10
  L('\n############ LANGKAH 10 — Petani mengecek angka di tab Laba Rugi vs Excel ############');
  await tablist.getByRole('tab', { name: 'Laba Rugi', exact: true }).click();
  await page.waitForTimeout(2500);
  const lrPanel = await page.getByTestId('finance-panel-laba-rugi').innerText();
  L('  ' + lrPanel.replace(/\s+/g, ' ').slice(0, 1400));
  const lrMasuk = rp((/Total Pendapatan\s*(Rp[\d.]+)/.exec(lrPanel.replace(/\s+/g, ' ')) || [])[1]);
  const lrKeluar = rp((/Total Pengeluaran\s*(Rp[\d.]+)/.exec(lrPanel.replace(/\s+/g, ' ')) || [])[1]);
  L(`  Laba Rugi -> pemasukan=${lrMasuk} pengeluaran=${lrKeluar}`);
  F(lrMasuk === EXPECT.totalPemasukan ? 'ok' : 'BUG', 'laba-rugi', `Laba Rugi "Total Pendapatan" ${lrMasuk} vs Excel ${EXPECT.totalPemasukan}.`);
  F(lrKeluar === EXPECT.totalPengeluaran ? 'ok' : 'BUG', 'laba-rugi', `Laba Rugi "Total Pengeluaran" ${lrKeluar} vs Excel ${EXPECT.totalPengeluaran}.`);

  // ============================================================ LANGKAH 11
  L('\n############ LANGKAH 11 — Petani mencoba export ############');
  const dls = [];
  page.on('download', (d) => dls.push(d.suggestedFilename()));
  const exportExcel = await firstVisible(page.locator('[data-guide-target="finance-export"]'));
  if (exportExcel) {
    const dis = await exportExcel.isDisabled();
    L(`  tombol Export Excel disabled? ${dis}`);
    if (!dis) {
      await exportExcel.click().catch((e) => L('  ERR: ' + e.message.split('\n')[0]));
      await page.waitForTimeout(5000);
      L('  download terpicu: ' + JSON.stringify(dls));
      F(dls.length > 0 ? 'ok' : 'BUG', 'export', dls.length > 0 ? `Export Excel berhasil (${dls[0]}).` : 'Export Excel tidak menghasilkan file.');
    }
  }
  const exportPdf = await firstVisible(page.locator('[data-guide-target="finance-export-pdf"]'));
  if (exportPdf) {
    const dis = await exportPdf.isDisabled();
    L(`  tombol Export Laporan (PDF) disabled? ${dis}`);
    if (!dis) {
      await exportPdf.click().catch((e) => L('  ERR: ' + e.message.split('\n')[0]));
      await page.waitForTimeout(5000);
      L('  download terpicu: ' + JSON.stringify(dls));
    }
  }
  await shot(page, 'setelah-export');

  // ============================================================ LANGKAH 12
  L('\n############ LANGKAH 12 — Petani menambahkan satu transaksi baru ############');
  await tablist.getByRole('tab', { name: 'Buku Besar', exact: true }).click();
  await page.waitForTimeout(2000);
  const addTx = await firstVisible(page.locator('[data-guide-target="finance-add-transaction"], [data-guide-target="finance-add-transaction-mobile"], [data-guide-target="finance-add-transaction-empty"]'));
  if (addTx) {
    await addTx.click().catch((e) => L('  ERR: ' + e.message.split('\n')[0]));
    await page.waitForTimeout(2000);
    const txDlg = page.getByRole('dialog', { name: /^Catat Transaksi/ });
    const txVisible = await txDlg.isVisible().catch(() => false);
    L('  dialog Catat Transaksi terbuka? ' + txVisible);
    if (txVisible) {
      L('  field yang tersedia: ' + JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[role=dialog] label, [role=dialog] .MuiInputBase-input')).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 40)).filter(Boolean))));
      await shot(page, 'dialog-catat-transaksi', true);
    }
  }

  L('\n############ RINGKASAN ############');
  L('console: ' + JSON.stringify([...new Set(consoleIssues)], null, 1));
  L('pageerror: ' + JSON.stringify([...new Set(pageErrors)], null, 1));
  L('http: ' + JSON.stringify([...new Set(httpIssues)], null, 1));
} catch (e) {
  F('BUG', 'fatal', 'Simulasi terhenti: ' + e.message.slice(0, 600));
  await shot(page, 'fatal').catch(() => {});
  L('\nFATAL: ' + e.stack);
}

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify({ findings, consoleIssues, pageErrors, httpIssues }, null, 2), 'utf8');
await browser.close();
