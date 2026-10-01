import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), '.tmp', 'mobile-walk');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const L = (s) => { log.push(s); console.log(s); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, locale: 'id-ID' });
const page = await ctx.newPage();

let n = 0;
const shot = async (name, full = true) => { n += 1; await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, '0')}-${name}.png`), fullPage: full }); };
const txt = () => page.evaluate(() => document.body.innerText);

async function blockers() {
  return page.evaluate(() => {
    const out = [];
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return r.width > 30 && r.height > 30 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.top >= 0 && r.bottom <= window.innerHeight + 1;
    });
    for (const b of btns.slice(0, 40)) {
      const r = b.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && top !== b && !b.contains(top)) {
        const cs = getComputedStyle(top);
        const tr = top.getBoundingClientRect();
        out.push({ btn: (b.innerText || b.getAttribute('aria-label') || b.getAttribute('data-guide-target') || '').trim().slice(0, 32), blockedBy: `${top.tagName}.${String(top.className).slice(0, 45)}`, pos: cs.position, pe: cs.pointerEvents, z: cs.zIndex, size: `${Math.round(tr.width)}x${Math.round(tr.height)}` });
      }
    }
    return out;
  });
}

L('############ MOBILE WALKTHROUGH — 360x740, pengguna baru ############');
await page.goto(BASE + '/login', { waitUntil: 'load' });
await page.waitForTimeout(4000);
L('1. Halaman login: ' + (await txt()).replace(/\n+/g, ' | '));
await shot('login');

L('\n2. Klik "Masuk sebagai Tamu"');
await page.getByRole('button', { name: /Masuk sebagai Tamu/i }).click();
for (let i = 0; i < 20 && !page.url().includes('/dashboard'); i += 1) await page.waitForTimeout(500);
L('   URL: ' + page.url());
await page.waitForTimeout(7000);

L('\n3. Guide onboarding di dashboard');
const guideDlg = page.getByRole('dialog', { name: /Kenalan dengan Arina Agri/i });
L('   guide visible: ' + (await guideDlg.isVisible().catch(() => false)));
await shot('guide-1', false);
const guideVisibleOnScreen = await page.evaluate(() => {
  const el = document.querySelector('[data-guide-placement-zone]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inViewport: r.y >= 0 && r.y + r.height <= window.innerHeight };
});
L('   posisi popover guide: ' + JSON.stringify(guideVisibleOnScreen));

const lewati = page.getByRole('button', { name: 'Lewati', exact: true });
L('   tombol "Lewati" terlihat: ' + (await lewati.isVisible().catch(() => false)));
if (await lewati.count()) {
  await lewati.click({ timeout: 8000 }).catch((e) => L('   ERR Lewati: ' + e.message.split('\n')[0]));
  await page.waitForTimeout(2000);
}
L('   guide masih ada? ' + (await page.locator('[data-guide-placement-zone]').count()));
L('   tombol yang terblokir setelah Lewati: ' + JSON.stringify(await blockers(), null, 1));

L('\n4. Coba tap tiap item bottom navigation (tanpa force)');
for (const t of ['nav-dashboard', 'nav-keuangan', 'nav-ensiklopedia', 'nav-kalender', 'nav-lainnya']) {
  const loc = page.locator(`[data-guide-target="${t}"]`).last();
  if (!(await loc.count())) { L(`   ${t}: tidak ada`); continue; }
  const before = page.url();
  const err = await loc.click({ timeout: 5000 }).then(() => null).catch((e) => e.message.split('\n')[0]);
  await page.waitForTimeout(2500);
  L(`   ${t}: tap=${err === null ? 'OK' : 'GAGAL'}${err ? ' (' + err.slice(0, 70) + ')' : ''} → url ${before} => ${page.url()}`);
  if (page.url().includes('dashboard') && !page.url().endsWith('/dashboard')) {
    await page.goto(BASE + '/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(4000);
  }
}
await shot('setelah-nav');

L('\n5. Buka sheet "Lainnya" dan lihat isinya');
const lain = page.locator('[data-guide-target="nav-lainnya"]').last();
await lain.click({ timeout: 8000 }).catch((e) => L('   ERR Lainnya: ' + e.message.split('\n')[0]));
await page.waitForTimeout(1500);
await shot('lainnya-sheet', false);
L('   isi sheet: ' + (await txt()).replace(/\n+/g, ' | '));
L('   item di sheet: ' + JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[data-guide-target^="mobile-feature-"]')).map((e) => e.getAttribute('data-guide-target')))));

L('\n6. Dari sheet Lainnya, coba buka Cuaca');
const cuacaItem = page.locator('[data-guide-target="mobile-feature-cuaca"]').first();
if (await cuacaItem.isVisible().catch(() => false)) {
  const err = await cuacaItem.click({ timeout: 6000 }).then(() => null).catch((e) => e.message.split('\n')[0]);
  await page.waitForTimeout(6000);
  L(`   tap Cuaca: ${err === null ? 'OK' : 'GAGAL (' + err.slice(0, 70) + ')'} → ${page.url()}`);
} else {
  L('   item Cuaca tidak terlihat di sheet');
}
await shot('cuaca', true);
L('   isi halaman Cuaca: ' + (await txt()).replace(/\n+/g, ' | '));

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
await browser.close();