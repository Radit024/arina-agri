import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { summarizeRouteBundles } from '@/scripts/perf-bundles.mjs';

describe('summarizeRouteBundles', () => {
  it('reads app client manifests and totals route chunks', async () => {
    const root = join(tmpdir(), `arina-perf-${Date.now()}`);
    await mkdir(join(root, '.next', 'server', 'app', 'dashboard', 'page'), { recursive: true });
    await mkdir(join(root, '.next', 'static', 'chunks'), { recursive: true });

    await writeFile(join(root, '.next', 'static', 'chunks', 'a.js'), 'console.log("a");');
    await writeFile(join(root, '.next', 'static', 'chunks', 'b.js'), 'console.log("b");');
    await writeFile(
      join(root, '.next', 'server', 'app', 'dashboard', 'page_client-reference-manifest.js'),
      [
        'globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};',
        'globalThis.__RSC_MANIFEST["/dashboard/page"] = {',
        '  entryJSFiles: {',
        '    "[project]/app/dashboard/page": ["static/chunks/a.js", "static/chunks/b.js"]',
        '  }',
        '};',
      ].join('\n'),
    );

    const rows = await summarizeRouteBundles(root);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      route: '/dashboard/page',
      chunks: 2,
    });
    expect(Number(rows[0].gzipKB)).toBeGreaterThan(0);
  });
});
