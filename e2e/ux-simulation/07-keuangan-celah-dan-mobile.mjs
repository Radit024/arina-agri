/**
 * Lanjutan simulasi "__petani pertama kali__" — fokus pada celah yang ditemukan:
 *  A. Asumsi Produksi (HPP/BEP/BC) tidak terimpor padahal ada di Excel
 *  B. Asumsi Pembiayaan tidak terimpor padahal ada di Excel
 *  C. Export Laporan PDF
 *  D. Skenario Proyeksi vs Realisasi — keputusan paling penting tapi tanpa penjelasan
 *  E. Kategori "Distribusi Pengeluaran" yang campuran
 *  F. Alur mobile
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const XLSX = 'references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx';
const OUT = path.join(process.cwd(), '.tmp', 'keuangan-petani-2');
fs.mkdirSync(OUT, { recursive: true });

const log = [];
const findings = [];
let shotN = 0;
const L = (s) => { log.push(s); console.log(s); };
const F = (sev, area, detail) => { findings.push({ sev, area, detail }); console.log(`${sev.toUpperCase().padEnd(4)} [${area}] ${detail}`); };
async function shot(page, name, full = false) { shotN += 1; await page.screenshot({ path: path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`), fullPage: full }); }
async function firstVisible(loc) { const n = await loc.count(); for (let i = 0; i < n; i += 1) if (await loc.nth(i).isVisible().catch(() => false)) return loc.nth(i); return null; }
const text = (page) => page.evaluate(() => document.body.innerText);

/** Tutup dialog AppDialog/MUI Dialog yang masih terbuka (mode tamu menolak sebagian aksi). */
async function closeAnyDialog(page, headingRe) {
  for (let i = 0; i < 8; i += 1) {
    const still = await page.locator('[role="dialog"]').filter({ hasText: headingRe }).count();
    if (!still) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /^(Batal|Tutup|Batal)$/ }).first().click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(800);
}

const USER_ID = '00000000-0000-4000-8000-0000000000f1';

const browser = await chromium.launch();

// ============================================================ A-E DESKTOP
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'id-ID' });
const page = await ctx.newPage();
const consoleIssues = [];
page.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('webpack-hmr') && !t.includes('HMR') && !t.includes('Supabase Debug') && !t.includes('React DevTools')) { const s = `[${m.type()}] ${t}`.slice(0, 400); if (!consoleIssues.includes(s)) consoleIssues.push(s); } });
page.on('pageerror', (e) => { F('BUG', 'js', 'pageerror: ' + e.message.slice(0, 300)); });

await page.addInitScript((uid) => {
  localStorage.setItem('arina_auth_mode', 'local');
  localStorage.setItem('arina_local_user_id', uid);
  localStorage.setItem('arina_user_id', uid);
  // reuse project/import from previous run
  const dump = localStorage.getItem('arina-fin-projects');
  if (dump) localStorage.setItem('arina-fin-projects', dump);
}, USER_ID);

try {
  L('\n########## A. PERSIAPAN: import ulang file Excel ##########');
  await page.goto(BASE + '/dashboard/keuangan', { waitUntil: 'load' });
  await page.waitForTimeout(7000);

  // buat proyek + import (ringkas)
  const buat = await firstVisible(page.getByRole('button', { name: 'Buat Proyek', exact: true }));
  if (await buat.count() && await buat.isVisible().catch(() => false)) {
    await buat.click();
    const d = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
    await d.waitFor({ state: 'visible', timeout: 10000 });
    await d.getByRole('textbox', { name: /^Nama Proyek/ }).fill('USAHATANI PADI 1 HA');
    await d.getByRole('textbox', { name: /^Komoditas Utama/ }).fill('Padi');
    await d.getByRole('textbox', { name: 'Label Musim Tanam', exact: true }).fill('MT 3 (AGUSTUS - DESEMBER 2026)');
    await d.getByRole('textbox', { name: 'Tanggal Mulai', exact: true }).fill('01-08-2026');
    await d.getByRole('textbox', { name: 'Tanggal Selesai', exact: true }).fill('31-12-2026');
    await d.getByRole('button', { name: 'Buat Proyek', exact: true }).click();
    await d.waitFor({ state: 'hidden', timeout: 20000 });
    await page.waitForTimeout(2500);
  }
  const imp = await firstVisible(page.getByRole('button', { name: /Import Excel/i }));
  await imp.click();
  await page.locator('[role="dialog"] input[type=file]').first().waitFor({ state: 'attached', timeout: 10000 });
  await page.locator('[role="dialog"] input[type=file]').first().setInputFiles(XLSX);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Lanjutkan Impor/i }).click();
  await page.waitForTimeout(6000);
  const konfirm = page.getByRole('button', { name: /Konfirmasi & Simpan ke Sistem/i });
  if (await konfirm.count()) { await konfirm.click(); await page.waitForTimeout(9000); }
  await page.getByRole('button', { name: /^Selesai$/ }).click().catch(() => {});
  await page.waitForTimeout(4000);
  L('  import selesai.');

  const tablist = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' });

  // ============================================================ D
  L('\n########## D. Skenario Proyeksi vs Realisasi ##########');
  const modeBar = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find((e) => /^Mode: /.test((e.textContent || '').trim()) && e.children.length === 0);
    return el ? (el.textContent || '').trim() : null;
  });
  L('  mode aktif: ' + modeBar);
  const modeHelp = await page.evaluate(() => {
    const all = document.body.innerText;
    const hits = [];
    for (const kw of ['Proyeksi', 'Realisasi', 'rencana', 'proyeksi', 'target', ' Simulation']) {
      const re = new RegExp('.{0,70}' + kw + '.{0,70}', 'i');
      const m = re.exec(all);
      if (m) hits.push(m[0].replace(/\s+/g, ' '));
    }
    return hits.slice(0, 6);
  });
  L('  penjelasan mode yang tersedia di halaman: ' + JSON.stringify(modeHelp, null, 1));
  const explainsMode = /APA ITU|artinya|berbeda|perbedaan|pengertian|maksud/i.test(await text(page));
  F(explainsMode ? 'ok' : 'BUG', 'skenario-ux', explainsMode
    ? 'Halaman menjelaskan perbedaan Proyeksi vs Realisasi.'
    : 'TIDAK ADA penjelasan perbedaan "Rencana (Proyeksi)" vs "Aktual (Realisasi)". Ini keputusan paling menentukan di seluruh alur — semuanya salah pilih = laporan salah. Petani mengimpor transaksi NYATA tapi default app adalah "Rencana (Proyeksi)".');

  // ============================================================ A
  L('\n########## A. Asumsi Produksi (HPP/BEP/BC) ##########');
  await tablist.getByRole('tab', { name: 'Laba Rugi', exact: true }).click();
  await page.waitForTimeout(2500);
  const lrTxt = await text(page);
  const hasAssump = /Belum Dikonfigurasi/i.test(lrTxt);
  L('  state asumsi: ' + (hasAssump ? 'BELUM DIKONFIGURASI' : 'sudah ada angka HPP/BEP'));
  F(hasAssump ? 'BUG' : 'ok', 'import-kelengkapan', hasAssump
    ? 'Laba Rugi menampilkan "Asumsi Produksi Belum Dikonfigurasi" padahal file Excel-nya berisi baris "Produksi 7.000 kg", "Harga pasar 6.500", "HPP 3.165.571", "BEP Produksi 3.409,08", "B/C ratio 1,053" (baris 50-58 sheet RAB). Parser membuang baris itu karena plannedTotal kosong. Petani harus input ulang manual padahal datanya sudah ada di file-nya.'
    : 'Asumsi Produksi terisi.');
  await shot(page, 'laba-rugi-tanpa-asumsi', true);

  const atur = page.getByRole('button', { name: /Atur Asumsi Sekarang/i }).first();
  if (await atur.count()) {
    await atur.click().catch((e) => L('  ERR: ' + e.message.split('\n')[0]));
    await page.waitForTimeout(2000);
    const dlgTxt = await text(page);
    L('  dialog Asumsi Produksi: ' + dlgTxt.replace(/\n+/g, ' | ').slice(-900));
    await shot(page, 'dialog-asumsi-produksi', true);
    // isi dari angka Excel
    const fields = await page.evaluate(() => Array.from(document.querySelectorAll('[role=dialog] input')).map((i) => ({ label: i.getAttribute('aria-label'), ph: i.placeholder, type: i.type, val: i.value })));
    L('  field: ' + JSON.stringify(fields));
    const prodInput = page.locator('[role=dialog] input[type=number]').first();
    if (await prodInput.count()) await prodInput.fill('7000').catch(() => {});
    const priceInput = page.locator('[role=dialog] input[type=number]').nth(1);
    if (await priceInput.count()) await priceInput.fill('6500').catch(() => {});
    await shot(page, 'asumsi-produksi-terisi');
    const save = page.getByRole('button', { name: /Simpan Asumsi/i }).last();
    if (await save.count()) { await save.click().catch(() => {}); await page.waitForTimeout(3000); }
    const after = await text(page);
    // Mode tamu menolak penyimpanan asumsi — jadi HPP tidak akan pernah muncul di sini.
    // Yang diuji adalah: apakah penolakan itu dijelaskan ke pengguna?
    const guestBlocked = /Fitur asumsi tidak tersedia di mode tamu/i.test(after);
    const hpp = (/HPP[^A-Za-z0-9]{0,20}Rp\s?([\d.]+)/.exec(after.replace(/\s+/g, ' ')) || [])[1];
    const bep = (/BEP[^A-Za-z0-9]{0,30}([\d.,]+)/.exec(after.replace(/\s+/g, ' ')) || [])[1];
    L(`  setelah isi 7.000 kg @ 6.500 -> HPP=${hpp} (Excel 3.165.571) BEP=${bep} (Excel 3.409,08)`);
    if (guestBlocked) {
      F('warn', 'asumsi-guest',
        'Simpan Asumsi ditolak dengan pesan "Fitur asumsi tidak tersedia di mode tamu". '
        + 'Handling-nya jujur (ada pesan, bukan diam-diam gagal), TAPI artinya HPP/BEP/B-C Ratio '
        + 'tidak pernah bisa dilihat oleh pengguna mode tamu — padahal angkanya sudah ada di file Excel yang dia unggah.');
    } else if (hpp) {
      const num = Number(hpp.replace(/\./g, ''));
      F(Math.abs(num - 3165571) < 5000 ? 'ok' : 'BUG', 'hpp',
        `HPP hasil hitung app = ${hpp}; Excel menuliskan HPP = Rp 3.165.571. ${Math.abs(num - 3165571) < 5000 ? 'Angka cocok → perhitungan HPP benar, hanya tidak diimpor otomatis.' : 'ANGKA TIDAK COCOK.'}`);
    } else {
      F('BUG', 'hpp', 'Setelah asumsi diisi dan disimpan, HPP/BEP tidak muncul di panel Laba Rugi dan tidak ada pesan apa pun.');
    }
    await shot(page, 'setelah-asumsi-produksi', true);
  }
  // Mode tamu menolak penyimpanan asumsi, jadi dialog TIDAK menutup sendiri.
  // Tutup paksa sebelum pindah tab, kalau tidak tablist tidak bisa diklik.
  await closeAnyDialog(page, /Atur Asumsi/i);

  // ============================================================ B
  L('\n########## B. Asumsi Pembiayaan ##########');
  await tablist.getByRole('tab', { name: 'Arus Kas Pasca Pembiayaan', exact: true }).click();
  await page.waitForTimeout(2500);
  const finTxt = await text(page);
  L('  ' + finTxt.replace(/\n+/g, ' | ').slice(-600));
  await shot(page, 'arus-kas-pasca-pembiayaan', true);
  const belumAtur = /Belum diatur/i.test(finTxt);
  F(belumAtur ? 'BUG' : 'ok', 'import-kelengkapan', belumAtur
    ? 'Arus Kas Pasca Pembiayaan kosong ("Bunga Belum diatur", "Kas Akhir Belum diatur") padahal file Excel punya sheet "Arus Kas Pasca Pembiayaan" lengkap: Kebutuhan Modal Kerja 18.869.000, Modal sendiri 3.869.000, Pinjaman KUR 15.000.000, Suku bunga 6%/tahun = 3%/musim, Bunga 450.000, Jangka waktu 6 bulan. Data di sheet itu TIDAK dibaca importer sama sekali.'
    : 'Asumsi pembiayaan terisi.');
  const aturFin = page.getByRole('button', { name: /Atur Asumsi Pembiayaan/i }).first();
  if (await aturFin.count()) {
    await aturFin.click().catch(() => {});
    await page.waitForTimeout(2000);
    L('  dialog Pembiayaan: ' + (await text(page)).replace(/\n+/g, ' | ').slice(-800));
    await shot(page, 'dialog-asumsi-pembiayaan', true);
    await closeAnyDialog(page, /Pembiayaan/i);
  }

  // ============================================================ C
  L('\n########## C. Export Laporan PDF ##########');
  await tablist.getByRole('tab', { name: 'Buku Besar', exact: true }).click();
  await page.waitForTimeout(2000);
  const dls = [];
  page.on('download', (d) => { dls.push(d.suggestedFilename()); L('  [download] ' + d.suggestedFilename()); });
  const popups = [];
  page.on('popup', (p) => { popups.push(p.url()); L('  [popup] ' + p.url()); });
  const pdfBtn = await firstVisible(page.locator('[data-guide-target="finance-export-pdf"]'));
  L('  tombol Export Laporan: ' + (await pdfBtn.count() ? 'ada' : 'TIDAK ADA') + ' | text="' + (await pdfBtn.innerText().catch(() => '?')) + '"');
  if (await pdfBtn.count()) {
    await pdfBtn.click().catch((e) => L('  ERR klik: ' + e.message.split('\n')[0]));
    await page.waitForTimeout(3000);
    // PENTING: klik pertama hanya membuka dialog "Ekspor Laporan Keuangan".
    // File PDF baru terbentuk setelah klik tombol "Buat Laporan" di dalam dialog.
    const dialogOpened = await page.locator('[role="dialog"]').filter({ hasText: /Ekspor Laporan|Laporan Keuangan/ }).count();
    L('  dialog "Ekspor Laporan Keuangan" terbuka? ' + (dialogOpened ? 'ya' : 'TIDAK'));
    const buildBtn = page.getByRole('button', { name: /^Buat Laporan$/ });
    const nBuild = await buildBtn.count();
    L('  tombol "Buat Laporan" di dialog: ' + nBuild);
    if (nBuild > 0) {
      await buildBtn.first().click().catch((e) => L('  ERR buat laporan: ' + e.message.split('\n')[0]));
      await page.waitForTimeout(8000);
    }
    L('  downloads: ' + JSON.stringify(dls) + ' | popups: ' + JSON.stringify(popups));
    F(dls.some((f) => f.endsWith('.pdf')) ? 'ok' : 'BUG', 'export-pdf', dls.some((f) => f.endsWith('.pdf'))
      ? `Export PDF berhasil: ${dls.find((f) => f.endsWith('.pdf'))}. (Catatan: butuh 2 klik — "Export Laporan" membuka dialog, lalu "Buat Laporan" yang mengunduh.)`
      : `Klik "Export Laporan" → dialog → "Buat Laporan" TIDAK menghasilkan file PDF (downloads=${JSON.stringify(dls)}).`);
    await shot(page, 'setelah-export-pdf');
    await closeAnyDialog(page, /Ekspor Laporan|Laporan Keuangan/);
  }

  // ============================================================ E
  L('\n########## E. Kategori "Distribusi Pengeluaran" ##########');
  const dist = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).filter((e) => (e.innerText || '').includes('Distribusi Pengeluaran'));
    const card = el.length ? el[el.length - 1].closest('.MuiCard-root, .MuiBox-root') : null;
    return card ? (card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700) : null;
  });
  L('  ' + dist);
  F('warn', 'kategori-campuran',
    'Diagram "Distribusi Pengeluaran" mencampur DUA taksonomi berbeda dalam satu donut: kategori dari RAB ("Biaya Tetap", "Tenaga Kerja", "Jasa Alsintan", "Lain Lain") DAN kategori hasil auto-kategorisasi ("Pupuk", "Irigasi & Air", "Pestisida"). Akibatnya "Jasa Alsintan" di donut = Rp 6.650.000, padahal di tab RAB = Rp 8.150.000 (Rp 1.500.000-nya dipindah ke "Irigasi & Air"). Petani yang membandingkan dua angka itu akan bingung.');

  L('\n  console: ' + JSON.stringify([...new Set(consoleIssues)], null, 1));
} catch (e) {
  F('BUG', 'fatal', 'Simulasi terhenti: ' + e.message.slice(0, 500));
  await shot(page, 'fatal').catch(() => {});
  L('FATAL: ' + e.stack);
}

// ============================================================ F MOBILE
try {
  L('\n########## F. Alur MOBILE (390x844) ##########');
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'id-ID' });
  const mp = await mctx.newPage();
  await mp.addInitScript((uid) => {
    localStorage.setItem('arina_auth_mode', 'local');
    localStorage.setItem('arina_local_user_id', uid);
    localStorage.setItem('arina_user_id', uid);
  }, USER_ID + '2');
  await mp.goto(BASE + '/dashboard/keuangan', { waitUntil: 'load' });
  await mp.waitForTimeout(8000);
  const mText = (await text(mp)).replace(/\n+/g, ' | ');
  L('  halaman mobile (kunjungan pertama): ' + mText.slice(0, 900));
  await shot(mp, 'mobile-keuangan-awal', true);

  for (const label of ['Import Excel', 'Buat Proyek', 'Catat Transaksi', 'Export Excel']) {
    const b = await firstVisible(mp.getByRole('button', { name: new RegExp(`^${label}`, 'i') }));
    const n = await mp.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).count();
    L(`  tombol "${label}": jumlah di DOM = ${n}, terlihat = ${b ? 'ya' : 'TIDAK'}`);
  }
  const moreMenu = mp.getByRole('button', { name: 'Aksi lainnya', exact: true });
  L('  tombol "Aksi lainnya": ' + (await moreMenu.isVisible().catch(() => false)));
  if (await moreMenu.isVisible().catch(() => false)) {
    await moreMenu.click().catch(() => {});
    await mp.waitForTimeout(1200);
    L('  isi menu Aksi lainnya: ' + (await text(mp)).replace(/\n+/g, ' | ').slice(-500));
    await shot(mp, 'mobile-aksi-lainnya');
  }
  await mctx.close();
} catch (e) {
  F('BUG', 'mobile', 'Simulasi mobile terhenti: ' + e.message.slice(0, 300));
}

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await browser.close();