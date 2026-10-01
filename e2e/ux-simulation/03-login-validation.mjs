import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), '.tmp', 'verify3');
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const L = (s) => { log.push(s); console.log(s); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'id-ID' });
const page = await ctx.newPage();
await page.goto(BASE + '/login', { waitUntil: 'load' });
await page.waitForTimeout(4500);

L('=== A. cek validitas native browser ===');
L(JSON.stringify(await page.evaluate(() => {
  const form = document.querySelector('form');
  const email = form.querySelector('input[name="email"]');
  const pass = form.querySelector('input[name="password"]');
  return {
    formValid: form.checkValidity(),
    emailValid: email.checkValidity(),
    emailValidationMessage: email.validationMessage,
    passValidationMessage: pass.validationMessage,
    hasMinLengthAttr: pass.hasAttribute('minlength'),
  };
}), null, 1));

L('\n=== B. email tidak valid -> pesan native apa? ===');
await page.getByRole('textbox', { name: 'Alamat Email' }).fill('bukan-email');
L(JSON.stringify(await page.evaluate(() => {
  const email = document.querySelector('input[name="email"]');
  return { valid: email.checkValidity(), msg: email.validationMessage };
})));
L('  helperText MUI: ' + JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('.MuiFormHelperText-root')).map((e) => e.textContent))));

L('\n=== C. email valid + password 3 karakter -> apakah pesan Zod tampil? ===');
await page.getByRole('textbox', { name: 'Alamat Email' }).fill('petani@contoh.id');
await page.getByRole('textbox', { name: 'Kata Sandi' }).fill('abc');
await page.getByRole('button', { name: 'Masuk', exact: true }).click();
await page.waitForTimeout(2000);
L('  aria-invalid: ' + await page.evaluate(() => document.querySelectorAll('[aria-invalid="true"]').length));
L('  helperText MUI: ' + JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('.MuiFormHelperText-root')).map((e) => e.textContent))));
L('  body: ' + (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 300));
await page.screenshot({ path: path.join(OUT, 'short-password.png') });

L('\n=== D. register: submit kosong -> pesan? ===');
await page.goto(BASE + '/register', { waitUntil: 'load' });
await page.waitForTimeout(4000);
L(JSON.stringify(await page.evaluate(() => {
  const form = document.querySelector('form');
  if (!form) return { noForm: true };
  const inputs = Array.from(form.querySelectorAll('input')).map((i) => ({ name: i.name, type: i.type, required: i.required, minLength: i.getAttribute('minlength'), msg: i.validationMessage }));
  return { valid: form.checkValidity(), inputs };
}), null, 1));
await page.getByRole('button', { name: 'Daftar Sekarang', exact: true }).first().click();
await page.waitForTimeout(2000);
L('  helperText MUI: ' + JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('.MuiFormHelperText-root')).map((e) => e.textContent))));
await page.screenshot({ path: path.join(OUT, 'register-empty.png') });

fs.writeFileSync(path.join(OUT, 'log.txt'), log.join('\n'));
await browser.close();