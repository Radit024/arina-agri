import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

async function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, predicate, acc);
    } else if (predicate(fullPath, entry.name)) {
      acc.push(fullPath);
    }
  }

  return acc;
}

function loadManifest(code) {
  const context = { globalThis: {} };
  vm.runInNewContext(code, context);
  return context.globalThis.__RSC_MANIFEST || {};
}

function pickPageEntry(entryJSFiles) {
  const keys = Object.keys(entryJSFiles);
  return keys.find((key) => key.includes('/app/') && key.endsWith('/page')) || keys.at(-1);
}

async function sizeChunk(projectRoot, chunk) {
  const filePath = path.join(projectRoot, '.next', chunk);
  if (!existsSync(filePath)) return { raw: 0, gzip: 0 };
  const buffer = await readFile(filePath);
  return {
    raw: buffer.length,
    gzip: zlib.gzipSync(buffer).length,
  };
}

export async function summarizeRouteBundles(projectRoot = process.cwd()) {
  const appDir = path.join(projectRoot, '.next', 'server', 'app');
  const manifests = await walk(appDir, (_fullPath, name) => name.endsWith('page_client-reference-manifest.js'));
  const rows = [];

  for (const manifestPath of manifests) {
    const manifest = loadManifest(await readFile(manifestPath, 'utf8'));
    const route = Object.keys(manifest)[0];
    if (!route) continue;

    const entryJSFiles = manifest[route].entryJSFiles || {};
    const pageEntry = pickPageEntry(entryJSFiles);
    const chunks = [...new Set(pageEntry ? entryJSFiles[pageEntry] || [] : [])];
    let raw = 0;
    let gzip = 0;

    for (const chunk of chunks) {
      const size = await sizeChunk(projectRoot, chunk);
      raw += size.raw;
      gzip += size.gzip;
    }

    rows.push({
      route,
      chunks: chunks.length,
      rawKB: (raw / 1024).toFixed(1),
      gzipKB: (gzip / 1024).toFixed(1),
    });
  }

  return rows.sort((a, b) => Number(b.gzipKB) - Number(a.gzipKB));
}

async function main() {
  const buildManifest = path.join(process.cwd(), '.next', 'build-manifest.json');
  try {
    await stat(buildManifest);
  } catch {
    console.error('No .next build found. Run `npm run build` before `npm run perf:bundles`.');
    process.exitCode = 1;
    return;
  }

  console.table(await summarizeRouteBundles());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  void main();
}
