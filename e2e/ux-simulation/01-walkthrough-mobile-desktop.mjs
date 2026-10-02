import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), '.tmp', 'sim');
fs.mkdirSync(OUT, { recursive: true });

const findings = [];
const consoleIssues = [];
const pageErrors = [];
const httpIssues = [];
const steps = [];

function F(sev, area, detail) {
  findings.push({ sev, area, detail });
  console.log(`${sev.toUpperCase().padEnd(4)} [${area}] ${detail}`);
}
function S(detail) {
  steps.push(detail);
  console.log(`STEP: ${detail}`);
}

let shotN = 0;
async function shot(page, name, full = false) {
  shotN += 1;
  await page.screenshot({ path: path.join(OUT, `${String(shotN).padStart(2, '0')}-${name}.png`), fullPage: full });
}

function wire(page, tag) {
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('webpack-hmr') || t.includes('React DevTools') || t.includes('[HMR]')) return;
    if (m.type() === 'error' || m.type() === 'warning') {
      const s = `[${tag}][${m.type()}] ${t}`.slice(0, 500);
      if (!consoleIssues.includes(s)) consoleIssues.push(s);
    }
  });
  page.on('pageerror', (e) => {
    const s = `[${tag}] ${e.message}`.slice(0, 500);
    if (!pageErrors.includes(s)) pageErrors.push(s);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) {
      const s = `[${tag}] ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`.slice(0, 500);
      if (!httpIssues.includes(s)) httpIssues.push(s);
    }
  });
  page.on('requestfailed', (r) => {
    if (r.url().includes('_next/webpack-hmr')) return;
    const s = `[${tag}] FAILED ${r.method()} ${r.url().replace(BASE, '')} :: ${r.failure()?.errorText}`.slice(0, 500);
    if (!httpIssues.includes(s)) httpIssues.push(s);
  });
}

async function overflow(page) {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.right > iw + 2 || r.left < -2);
      })
      .slice(0, 8)
      .map((el) => `${el.tagName}.${String(el.className || '').slice(0, 50)} [${Math.round(el.getBoundingClientRect().left)}..${Math.round(el.getBoundingClientRect().right)}]`);
    return { sw, iw, overflow: sw > iw + 1, offenders };
  });
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

// ---------------------------------------------------------------- MAIN
const browser = await chromium.launch();

for (const device of [
  { name: 'mobile', vp: { width: 390, height: 844 }, mob: true },
  { name: 'desktop', vp: { width: 1440, height: 900 }, mob: false },
]) {
  const ctx = await browser.newContext({
    viewport: device.vp,
    isMobile: device.mob,
    hasTouch: device.mob,
    locale: 'id-ID',
    permissions: [],
  });
  const page = await ctx.newPage();
  wire(page, device.name);

  console.log(`\n\n#################### ${device.name.toUpperCase()} ####################`);

  // === STEP 1: cold open root
  S(`${device.name}: buka http://127.0.0.1:3000/ (pengguna baru, storage kosong)`);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  S(`URL setelah buka root: ${page.url()}`);
  await shot(page, `${device.name}-login`);

  const loginText = await bodyText(page);
  console.log('LOGIN TEXT >>> ' + loginText.replace(/\n+/g, ' | '));

  // === STEP 2: try empty submit (as a confused farmer would)
  const submit = page.getByRole('button', { name: 'Masuk', exact: true });
  if (await submit.count()) {
    await submit.click();
    await page.waitForTimeout(1200);
    const t = await bodyText(page);
    const hasErr = /tidak valid|minimal 6 karakter/i.test(t);
    F(hasErr ? 'ok' : 'BUG', 'login', hasErr
      ? 'Klik "Masuk" dengan form kosong memunculkan pesan validasi yang jelas.'
      : 'Klik "Masuk" dengan form kosong TIDAK memunculkan pesan validasi — pengguna baru bingung.');
    await shot(page, `${device.name}-login-validation`);
  }

  // === STEP 3: try "Masuk sebagai Tamu"
  const guest = page.getByRole('button', { name: /Masuk sebagai Tamu/i });
  const guestVisible = await guest.isVisible().catch(() => false);
  F(guestVisible ? 'warn' : 'n/a', 'login', guestVisible
    ? 'Tombol "Masuk sebagai Tamu" tampil di halaman login produksi —Bila aktif, ini membiarkan siapa pun masuk tanpa akun (perlu dicek apakah disengaja untuk production).'
    : 'Tombol "Masuk sebagai Tamu" tidak tampil.');
  if (guestVisible) {
    await guest.click();
    await page.waitForTimeout(4000);
    const url = page.url();
    const storage = await page.evaluate(() => ({ ...localStorage }));
    const ok = url.includes('/dashboard');
    F(ok ? 'ok' : 'BUG', 'login', ok
      ? 'Klik "Masuk sebagai Tamu" langsung masuk ke dashboard.'
      : `Klik "Masuk sebagai Tamu" tidak masuk ke dashboard (URL tetap ${url}, localStorage=${JSON.stringify(storage)}).`);
    await shot(page, `${device.name}-after-guest`);
  }

  // === STEP 4: force entry to dashboard (simulate already logged in) via local dev auth
  S(`${device.name}: masuk ke dashboard dengan sesi lokal dev (guest mode)`);
  await page.evaluate(() => {
    localStorage.setItem('arina_auth_mode', 'local');
    localStorage.setItem('arina_local_user_id', '00000000-0000-4000-8000-000000000007');
    localStorage.setItem('arina_user_id', '00000000-0000-4000-8000-000000000007');
    document.cookie = 'arina_guest_session=1; path=/; max-age=604800; SameSite=Lax';
  });

  const t0 = Date.now();
  await page.goto(BASE + '/dashboard', { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  S(`${device.name}: dashboard terbuka dalam ${Date.now() - t0}ms`);
  await shot(page, `${device.name}-dashboard`, true);
  console.log('DASHBOARD TEXT >>>\n' + (await bodyText(page)).slice(0, 3500));
  let ov = await overflow(page);
  F(ov.overflow ? 'BUG' : 'ok', 'layout', ov.overflow
    ? `Dashboard ${device.name}: horizontal overflow (scrollWidth=${ov.sw} > ${ov.iw}). Offender: ${ov.offenders.join(' ; ')}`
    : `Dashboard ${device.name}: tidak ada horizontal overflow.`);

  // onboarding guide
  const guideTitle = page.locator('#guide-dialog-title');
  if (await guideTitle.isVisible({ timeout: 8000 }).catch(() => false)) {
    S(`${device.name}: guide onboarding muncul otomatis: "${await guideTitle.innerText()}"`);
    F('ok', 'onboarding', 'Guide onboarding otomatis muncul di kunjungan pertama.');
    let i = 0;
    while (i < 12) {
      await shot(page, `${device.name}-guide-${i + 1}`);
      const next = page.getByRole('button', { name: /Berikutnya|Selesai/ }).last();
      if (!(await next.count()) || !(await next.isVisible().catch(() => false))) break;
      const label = (await next.innerText()).trim();
      await next.click();
      await page.waitForTimeout(500);
      if (label.includes('Selesai')) break;
      i += 1;
    }
    await page.waitForTimeout(600);
  } else {
    F('warn', 'onboarding', `Guide onboarding TIDAK muncul otomatis di kunjungan pertama (${device.name}).`);
  }

  // === STEP 5: navigate via nav (click) to each module
  const navTargets = [
    ['Cuaca', 'nav-cuaca', '/dashboard/cuaca'],
    ['Berita', 'nav-kabar-pasar', '/dashboard/kabar-pasar'],
    ['Manajemen Keuangan', 'nav-keuangan', '/dashboard/keuangan'],
    ['Manajemen Stok', 'nav-stok', '/dashboard/stok'],
    ['Smart Kalender', 'nav-kalender', '/dashboard/kalender'],
    ['AI Chat', 'nav-ensiklopedia', '/dashboard/ensiklopedia'],
  ];

  for (const [label, target, url] of navTargets) {
    S(`${device.name}: klik nav "${label}"`);
    let clicked = false;
    if (device.mob) {
      // mobile: use bottom tab bar / Lainnya
      const inTab = page.locator(`[data-guide-target="${target}"]`).first();
      if (await inTab.isVisible().catch(() => false)) {
        await inTab.click({ timeout: 6000, force: true }).then(() => { clicked = true; }).catch((e) => {
          F('BUG', 'navigasi', `Klik nav mobile "${label}" gagal: ${e.message.split('\n')[0]}`);
        });
      } else {
        const lainnya = page.locator('[data-guide-target="nav-lainnya"]').first();
        if (await lainnya.isVisible().catch(() => false)) {
          await lainnya.click({ timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(900);
          await shot(page, `${device.name}-lainnya-sheet`);
          const inSheet = page.locator(`[data-guide-target="${target}"]`).first();
          if (await inSheet.isVisible().catch(() => false)) {
            await inSheet.click({ timeout: 6000, force: true }).then(() => { clicked = true; }).catch((e) => {
              F('BUG', 'navigasi', `Klik item "${label}" di sheet Lainnya gagal: ${e.message.split('\n')[0]}`);
            });
          } else {
            F('warn', 'navigasi', `Item "${label}" tidak ditemukan di sheet "Lainnya" (mobile).`);
          }
        } else {
          F('BUG', 'navigasi', `Tombol "Lainnya" di bottom bar tidak ditemukan (mobile).`);
        }
      }
    } else {
      const item = page.locator(`[data-guide-target="${target}"]`).first();
      if (await item.isVisible().catch(() => false)) {
        await item.click({ timeout: 8000 }).then(() => { clicked = true; }).catch((e) => {
          F('BUG', 'navigasi', `Klik sidebar "${label}" gagal: ${e.message.split('\n')[0]}`);
        });
      } else {
        F('warn', 'navigasi', `Item sidebar "${label}" (${target}) tidak terlihat.`);
      }
    }

    await page.waitForTimeout(3500);
    const landed = page.url().includes(url.replace('/dashboard', ''));
    if (clicked) {
      F(landed ? 'ok' : 'BUG', 'navigasi', landed
        ? `Klik "${label}" berhasil membuka ${url}.`
        : `Klik "${label}" tidak berpindah halaman (URL masih ${page.url()}).`);
    }
    if (!landed) {
      await page.goto(BASE + url, { waitUntil: 'load' });
      await page.waitForTimeout(4500);
    }
    ov = await overflow(page);
    F(ov.overflow ? 'BUG' : 'ok', 'layout', ov.overflow
      ? `${url} (${device.name}): horizontal overflow (scrollWidth=${ov.sw} > ${ov.iw}). Offender: ${ov.offenders.join(' ; ')}`
      : `${url} (${device.name}): layout rapi, tidak ada horizontal overflow.`);
    await shot(page, `${device.name}${url.replace(/\//g, '-')}`, true);
    const txt = await bodyText(page);
    console.log(`\n---- ${url} (${device.name}) ----\n` + txt.slice(0, 2200));
    if (/Memuat data|Loading/i.test(txt)) {
      F('warn', 'loading', `${url} (${device.name}) masih menampilkan "Memuat data..." setelah ~4.5 detik.`);
    }
    if (/gagal|error|terjadi kesalahan|coba lagi/i.test(txt)) {
      F('warn', 'error-state', `${url} (${device.name}) menampilkan state error ke pengguna: ` + txt.match(/.{0,120}(gagal|error|terjadi kesalahan|coba lagi).{0,120}/i)?.[0]);
    }
  }

  // navigate back to dashboard for extra modules
  // Pengaturan hanya berupa modal, jadi dibuka lewat query string.
  await page.goto(BASE + '/dashboard?settings=true', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  await shot(page, `${device.name}-pengaturan`, true);
  console.log(`\n---- pengaturan (${device.name}) ----\n` + (await bodyText(page)).slice(0, 2000));

  fs.writeFileSync(path.join(OUT, `${device.name}-summary.json`), JSON.stringify({ steps, findings, consoleIssues, pageErrors, httpIssues }, null, 2));
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify({ steps, findings, consoleIssues, pageErrors, httpIssues }, null, 2));
console.log('\n\n===== CONSOLE =====\n' + [...new Set(consoleIssues)].join('\n'));
console.log('\n===== PAGE ERRORS =====\n' + [...new Set(pageErrors)].join('\n'));
console.log('\n===== HTTP ISSUES =====\n' + [...new Set(httpIssues)].join('\n'));

await browser.close();