import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), '.tmp', 'ux-hydration2');
fs.mkdirSync(OUT, { recursive: true });

const log = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'id-ID' });
const page = await ctx.newPage();
page.on('console', (m) => { const t = m.text(); if (!t.includes('webpack-hmr') && !t.includes('React DevTools')) log.push(`[${m.type()}] ${t}`.slice(0, 800)); });
page.on('pageerror', (e) => log.push(`[pageerror] ${(e.stack || e.message)}`.slice(0, 1500)));

async function probe(url) {
  log.push(`\n\n===== ${url} =====`);
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const withReact = all.filter((el) => Object.keys(el).some((k) => k.startsWith('__reactFiber') || k.startsWith('__reactContainer')));
    return {
      totalEls: all.length,
      reactAttachedCount: withReact.length,
      bodyChildren: Array.from(document.body.children).map((c) => c.tagName + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).slice(0, 40) : '')),
      scripts: Array.from(document.querySelectorAll('script[src]')).map((s) => s.getAttribute('src')).slice(0, 40),
    };
  });
  log.push('reactAttachedElements=' + info.reactAttachedCount + ' / ' + info.totalEls);
  log.push('bodyChildren=' + JSON.stringify(info.bodyChildren));
  log.push('scripts=' + JSON.stringify(info.scripts, null, 1));
  return info;
}

await probe('/login');
await probe('/register');
await probe('/dashboard');
await probe('/dashboard/keuangan');

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
console.log(log.join('\n'));
await browser.close();