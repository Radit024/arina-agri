import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), '.tmp', 'verify6');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const L = (s) => { log.push(s); console.log(s); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'id-ID' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('arina_auth_mode', 'local');
  localStorage.setItem('arina_local_user_id', '00000000-0000-4000-8000-0000000000ac');
  localStorage.setItem('arina_user_id', '00000000-0000-4000-8000-0000000000ac');
});

const net = [];
page.on('response', async (r) => {
  if (r.url().includes('/api/')) {
    let body = '';
    try { body = (await r.text()).slice(0, 200); } catch { body = '<no body>'; }
    net.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')} :: ${body}`);
  }
});
page.on('pageerror', (e) => L('[pageerror] ' + e.message.slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') L('[console.error] ' + m.text().slice(0, 250)); });

L('=== A. STOK: cek drawer/dialog yang terbuka ===');
await page.goto(BASE + '/dashboard/stok', { waitUntil: 'load' });
await page.waitForTimeout(8000);
L(JSON.stringify(await page.evaluate(() => {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .MuiDrawer-root, .MuiModal-root')).map((d) => {
    const r = d.getBoundingClientRect();
    const cs = getComputedStyle(d);
    return { cls: String(d.className).slice(0, 50), ariaHidden: d.getAttribute('aria-hidden'), visibility: cs.visibility, display: cs.display, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] };
  });
  const btns = Array.from(document.querySelectorAll('button')).map((b) => { const r = b.getBoundingClientRect(); return { t: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 26), vis: r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden' }; }).filter((b) => /Batch|Keluar|Stok/i.test(b.t));
  return { dialogs, btns };
}), null, 1));
await page.screenshot({ path: path.join(OUT, '01-stok.png') });

L('\n  tap "Tambah Batch" (yang terlihat)');
const cnt = await page.getByRole('button', { name: /Tambah Batch/i }).count();
L('  jumlah tombol Tambah Batch: ' + cnt);
for (let i = 0; i < cnt; i += 1) {
  const b = page.getByRole('button', { name: /Tambah Batch/i }).nth(i);
  L(`   [${i}] visible=${await b.isVisible().catch(() => false)} box=${JSON.stringify(await b.boundingBox())}`);
}
const vis = page.getByRole('button', { name: /Tambah Batch/i }).locator('visible=true').first();
await vis.click({ timeout: 8000 }).catch((e) => L('  ERR: ' + e.message.split('\n')[0]));
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, '02-stok-tambah-batch.png') });
L('  setelah tap: ' + (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(-500));

L('\n=== B. AI CHAT: kirim pertanyaan ===');
await page.goto(BASE + '/dashboard/ensiklopedia', { waitUntil: 'load' });
await page.waitForTimeout(8000);
const ta = page.locator('textarea').first();
L('  textarea ada: ' + (await ta.count()));
if (await ta.count()) {
  await ta.fill('Bagaimana cara overcame hama ulat grayak di cabai?');
  await page.waitForTimeout(500);
  const send = page.getByRole('button', { name: /Kirim|Send|arrow/i }).last();
  L('  tombol kirim: ' + (await send.count()));
  await send.click({ timeout: 8000 }).catch((e) => L('  ERR kirim: ' + e.message.split('\n')[0]));
}
await page.waitForTimeout(12000);
L('  isi chat: ' + (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(-800));
await page.screenshot({ path: path.join(OUT, '03-ai-chat.png'), fullPage: true });

L('\n=== NETWORK (/api) ===');
L([...new Set(net)].join('\n'));

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
await browser.close();