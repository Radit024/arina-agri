import packageJson from '@/package.json';
import { describe, expect, it } from 'vitest';

describe('package CI scripts', () => {
  it('defines explicit scripts used by GitHub Actions', () => {
    expect(packageJson.scripts.typecheck).toBe('next typegen && tsc --noEmit --pretty false');
    expect(packageJson.scripts.ci).toBe(
      'npm run lint && npm run typecheck && npm run test && npm run i18n:check && npm run build',
    );
    expect(packageJson.scripts['smoke:deploy']).toBe('node scripts/smoke-deploy.mjs');
  });
});
