import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const XLSX = 'references/CATATAN KEUANGAN PADI 1 Ha ADE.xlsx';
const OUT = path.join(process.cwd(), '.tmp', 'keuangan-mobile');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const findings = [];
const L = (s) => { log.push(s); console.log(s); };
const F = (sev, area, d) => { findings.push({ sev, area, d }); console.log(`${sev.toUpperCase().padEnd(4)} [${area}] ${d}`); };
let n = 0;
const shot = async (p, name, full = true) => { n += 1; await p.screenshot({ path: path.join(OUT, `${String(n).padStart(2, '0')}-${name}.png`), fullPage: full }); };
async function firstVisible(loc) { const c = await loc.count(); for (let i = 0; i < c; i += 1) if (await loc.nth(i).isVisible().catch(() => false)) return loc.nth(i); return null; }
const text = (p) => p.evaluate(() => document.body.innerText);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'id-ID' });
const page = await ctx.newPage();
const consoleIssues = [];
page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!t.includes('webpack-hmr')) { const s = t.slice(0, 250); if (!consoleIssues.includes(s)) consoleIssues.push(s); } } });
page.on('pageerror', (e) => L('  [pageerror] ' + e.message.slice(0, 250)));

try {
  L('########## M1. Masuk sebagai tamu dari HP ##########');
  await page.goto(BASE + '/login', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: /Masuk sebagai Tamu/i }).click();
  for (let i = 0; i < 25 && !page.url().includes('/dashboard'); i += 1) await page.waitForTimeout(400);
  L('  URL: ' + page.url());
  await page.waitForTimeout(6000);
  const lewati = page.getByRole('button', { name: 'Lewati', exact: true });
  if (await lewati.isVisible({ timeout: 5000 }).catch(() => false)) { await lewati.click().catch(() => {}); await page.waitForTimeout(1500); }

  L('\n########## M2. Buka Manajemen Keuangan dari bottom nav ##########');
  const nav = page.locator('[data-guide-target="nav-keuangan"]').last();
  await nav.click({ timeout: 10000 }).catch((e) => L('  ERR: ' + e.message.split('\n')[0]));
  await page.waitForTimeout(5000);
  L('  URL: ' + page.url());
  L('  isi: ' + (await text(page)).replace(/\n+/g, ' | ').slice(0, 800));
  await shot(page, 'mobile-awal');

  L('\n########## M3. Buat proyek dari HP ##########');
  const buat = await firstVisible(page.getByRole('button', { name: 'Buat Proyek', exact: true }));
  L('  tombol Buat Proyek: ' + (buat ? 'ada' : 'TIDAK'));
  await buat.click();
  const dlg = page.getByRole('dialog', { name: 'Buat Proyek Baru', exact: true });
  await dlg.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(800);
  await shot(page, 'mobile-buat-proyek-dialog', false);
  await dlg.getByRole('textbox', { name: /^Nama Proyek/ }).fill('USAHATANI PADI 1 HA');
  await dlg.getByRole('textbox', { name: /^Komoditas Utama/ }).fill('Padi');
  await dlg.getByRole('textbox', { name: 'Tanggal Mulai', exact: true }).fill('01-08-2026');
  await dlg.getByRole('textbox', { name: 'Tanggal Selesai', exact: true }).fill('31-12-2026');
  await page.waitForTimeout(400);
  const submit = dlg.getByRole('button', { name: 'Buat Proyek', exact: true });
  L('  posisi tombol submit: ' + JSON.stringify(await submit.boundingBox()));
  L('  submit terpotong di layar? ' + JSON.stringify(await submit.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const sheet = el.closest('[role=dialog]')?.querySelector('.MuiDialog-paper, .MuiPaper-root');
    const sr = sheet ? sheet.getBoundingClientRect() : null;
    return { btnBottom: Math.round(r.bottom), sheetBottom: sr ? Math.round(sr.bottom) : null, viewportH: window.innerHeight, withinSheet: sr ? r.bottom <= sr.bottom + 1 : null, withinViewport: r.bottom <= window.innerHeight };
  })));
  await submit.click({ timeout: 10000 }).catch((e) => L('  ERR submit: ' + e.message.split('\n')[0]));
  await page.waitForTimeout(4000);
  L('  proyek dibuat? ' + (await page.getByRole('combobox').filter({ hasText: /USAHATANI PADI 1 HA/ }).count()));
  await shot(page, 'mobile-setelah-proyek');

  L('\n########## M4. Import Excel dari HP ##########');
  const imp = await firstVisible(page.getByRole('button', { name: /Import Excel/i }));
  L('  tombol Import Excel: ' + (imp ? 'ada' : 'TIDAK'));
  await imp.click();
  await page.locator('[role="dialog"] input[type=file]').first().waitFor({ state: 'attached', timeout: 10000 });
  await page.waitForTimeout(900);
  await shot(page, 'mobile-import-dialog', false);
  const dlgTxt = (await page.locator('[role="dialog"]').first().innerText()).replace(/\n+/g, ' | ');
  L('  dialog import: ' + dlgTxt.slice(0, 500));
  const dlgBox = await page.locator('[role="dialog"]').first().boundingBox();
  L('  ukuran dialog di layar 390px: ' + JSON.stringify(dlgBox));
  await page.locator('[role="dialog"] input[type=file]').first().setInputFiles(XLSX);
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Lanjutkan Impor/i }).click();
  await page.waitForTimeout(7000);
  await shot(page, 'mobile-pratinjau', true);
  const pre = (await text(page)).replace(/\n+/g, ' | ');
  L('  pratinjau: ' + pre.slice(-900));
  const konfirm = page.getByRole('button', { name: /Konfirmasi & Simpan ke Sistem/i });
  L('  tombol konfirmasi ada? ' + await konfirm.count() + ' | visible? ' + (await konfirm.isVisible().catch(() => false)));
  const kBox = await konfirm.boundingBox().catch(() => null);
  L('  posisi tombol konfirmasi: ' + JSON.stringify(kBox));
  if (kBox) {
    const clipped = await konfirm.evaluate((el) => { const r = el.getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: window.innerHeight, inView: r.bottom <= window.innerHeight && r.top >= 0 }; });
    L('  >> ' + JSON.stringify(clipped));
    if (!clipped.inView) F('BUG', 'mobile-import', `Tombol "Konfirmasi & Simpan ke Sistem" berada di y=${clipped.bottom} sementara tinggi layar ${clipped.vh} — TOMBOL DI BAWAH LAYAR, tidak bisa diketuk tanpa scroll. Petani akan mengira import macet.`);
  }
  await konfirm.click({ timeout: 10000 }).catch((e) => L('  ERR konfirm: ' + e.message.split('\n')[0]));
  await page.waitForTimeout(9000);
  await shot(page, 'mobile-hasil-import', true);
  const sum = (await text(page)).replace(/\n+/g, ' | ');
  L('  hasil: ' + sum.slice(-800));
  await page.getByRole('button', { name: /^Selesai$/ }).click().catch(() => {});
  await page.waitForTimeout(4000);

  L('\n########## M5. Ringkasan setelah import di HP ##########');
  const cards = await page.evaluate(() => {
    const out = {};
    for (const lb of ['Total Pemasukan', 'Total Pengeluaran', 'ESTIMASI LABA BERSIH']) {
      const c = Array.from(document.querySelectorAll('.MuiCard-root')).find((x) => (x.innerText || '').includes(lb));
      if (c) out[lb] = (c.innerText || '').replace(/\s+/g, ' ').trim();
    }
    return out;
  });
  L('  ' + JSON.stringify(cards, null, 1));
  const okMasuk = /Rp 45\.500\.000/.test(cards['Total Pemasukan'] || '');
  const okKeluar = /Rp 22\.159\.000/.test(cards['Total Pengeluaran'] || '');
  const okLaba = /Rp 23\.341\.000/.test(cards['ESTIMASI LABA BERSIH'] || '');
  F(okMasuk && okKeluar && okLaba ? 'ok' : 'BUG', 'akurasi-mobile', `HP: Pemasukan ${okMasuk ? 'cocok' : 'SALAH'}, Pengeluaran ${okKeluar ? 'cocok' : 'SALAH'}, Laba ${okLaba ? 'cocok' : 'SALAH'}.`);

  L('\n########## M6. Tab laporan di HP ##########');
  const tablist = page.getByRole('tablist', { name: 'Navigasi laporan keuangan' });
  for (const [label, testid] of [['RAB', 'finance-panel-rab'], ['Laba Rugi', 'finance-panel-laba-rugi'], ['Arus Kas', 'finance-panel-arus-kas'], ['Arus Kas Pasca Pembiayaan', 'finance-panel-arus-kas-pasca-pembiayaan'], ['Perbandingan', 'finance-panel-perbandingan']]) {
    const t = tablist.getByRole('tab', { name: label, exact: true });
    const vis = await t.isVisible().catch(() => false);
    if (!vis) { F('BUG', 'mobile-tab', `Tab "${label}" tidak terlihat di tab bar HP.`); continue; }
    await t.click({ timeout: 8000 }).catch((e) => L(`  ERR ${label}: ` + e.message.split('\n')[0]));
    await page.waitForTimeout(2200);
    const p = page.getByTestId(testid);
    const v = await p.isVisible().catch(() => false);
    const inner = v ? (await p.innerText()).replace(/\s+/g, ' ').trim() : '';
    L(`  ${label}: visible=${v} | ${inner.slice(0, 260)}`);
    const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    if (ov.sw > ov.iw + 1) F('BUG', 'mobile-layout', `Tab ${label} di HP: horizontal overflow ${ov.sw} > ${ov.iw}.`);
    await shot(page, `mobile-tab-${label.replace(/\s/g, '-')}`, true);
  }

  L('\n########## M7. Aksi utama di HP setelah ada data ##########');
  await tablist.getByRole('tab', { name: 'Buku Besar', exact: true }).click().catch(() => {});
  await page.waitForTimeout(2000);
  for (const lbl of ['Catat Transaksi', 'Export Excel', 'Export Laporan']) {
    const c = await page.getByRole('button', { name: new RegExp(`^${lbl}`, 'i') }).count();
    L(`  "${lbl}" di DOM: ${c}`);
  }
  const fab = page.locator('[data-guide-target="finance-add-transaction-mobile"]');
  L('  FAB mobile (finance-add-transaction-mobile): ' + await fab.count() + ' | visible: ' + (await firstVisible(fab) ? 'ya' : 'TIDAK'));
  await shot(page, 'mobile-buku-besar-akhir', true);

  L('\n  console errors: ' + JSON.stringify([...new Set(consoleIssues)], null, 1));
} catch (e) {
  F('BUG', 'mobile-fatal', 'Simulasi mobile terhenti: ' + e.message.slice(0, 400));
  await shot(page, 'mobile-fatal').catch(() => {});
  L('FATAL: ' + e.stack);
}

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'), 'utf8');
fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(findings, null, 2), 'utf8');
await browser.close();