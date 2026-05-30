import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = join(process.cwd(), '.github', 'workflows', 'ci-cd.yml');

describe('GitHub Actions CI/CD workflow', () => {
  it('defines quality, preview, and production jobs', () => {
    const workflow = readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('quality:');
    expect(workflow).toContain('preview-deploy:');
    expect(workflow).toContain('production-deploy:');
  });

  it('runs the required quality commands', () => {
    const workflow = readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run lint');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm run test');
    expect(workflow).toContain('npm run i18n:check');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('npm run perf:bundles');
  });

  it('deploys Vercel preview and production from prebuilt output', () => {
    const workflow = readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('vercel pull --yes --environment=preview');
    expect(workflow).toContain('vercel build --token="$VERCEL_TOKEN"');
    expect(workflow).toContain('vercel deploy --prebuilt --token="$VERCEL_TOKEN"');
    expect(workflow).toContain('vercel pull --yes --environment=production');
    expect(workflow).toContain('vercel build --prod --token="$VERCEL_TOKEN"');
    expect(workflow).toContain('vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"');
  });

  it('runs smoke checks after preview and production deploys', () => {
    const workflow = readFileSync(workflowPath, 'utf8');

    const matches = workflow.match(/npm run smoke:deploy/g) ?? [];
    expect(matches).toHaveLength(2);
  });
});
