# GitHub Actions CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete GitHub Actions CI/CD pipeline that runs quality gates, deploys pull request previews, deploys production from `main`, and verifies deployments with smoke checks.

**Architecture:** Add explicit npm scripts, a small deployment smoke-test script, one GitHub Actions workflow, and deployment documentation. GitHub Actions orchestrates all CI/CD work while Vercel CLI performs preview and production deployments from prebuilt artifacts.

**Tech Stack:** GitHub Actions, Node.js 20, npm, Next.js 16, TypeScript, Vitest, ESLint, Vercel CLI.

---

## File Structure

**Create**
- `.github/workflows/ci-cd.yml` - Full CI/CD workflow with quality, preview deploy, and production deploy jobs.
- `scripts/smoke-deploy.mjs` - Reusable Node smoke-test script for deployed URLs.
- `tests/scripts/packageScripts.test.ts` - Guards CI-related npm scripts.
- `tests/scripts/smokeDeploy.test.ts` - Unit tests for the smoke-test script.
- `tests/scripts/cicdWorkflow.test.ts` - Static checks for the GitHub Actions workflow.
- `docs/deployment/github-actions.md` - Operator documentation for secrets, triggers, and branch protection.

**Modify**
- `package.json` - Add `typecheck`, `ci`, and `smoke:deploy` scripts.
- `README.md` - Replace stale build script references with the current CI/CD scripts.

---

### Task 1: Add CI npm Scripts

**Files:**
- Modify: `package.json`
- Create: `tests/scripts/packageScripts.test.ts`

- [ ] **Step 1: Write the failing package script test**

Create `tests/scripts/packageScripts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest tests/scripts/packageScripts.test.ts
```

Expected: FAIL because `typecheck`, `ci`, and `smoke:deploy` do not exist yet.

- [ ] **Step 3: Add CI scripts to `package.json`**

Update only the `scripts` object in `package.json` so it contains:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "perf:bundles": "node scripts/perf-bundles.mjs",
  "i18n:check": "node scripts/check-i18n.mjs",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit --pretty false",
  "test": "vitest run",
  "ci": "npm run lint && npm run typecheck && npm run test && npm run i18n:check && npm run build",
  "smoke:deploy": "node scripts/smoke-deploy.mjs"
}
```

- [ ] **Step 4: Run the package script test**

Run:

```bash
npx vitest tests/scripts/packageScripts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json tests/scripts/packageScripts.test.ts
git commit -m "chore: add ci package scripts"
```

---

### Task 2: Add Deployment Smoke Script

**Files:**
- Create: `scripts/smoke-deploy.mjs`
- Create: `tests/scripts/smokeDeploy.test.ts`

- [ ] **Step 1: Write the failing smoke script tests**

Create `tests/scripts/smokeDeploy.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { checkDeployment, normalizeDeploymentUrl } from '@/scripts/smoke-deploy.mjs';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('normalizeDeploymentUrl', () => {
  it('adds https when the value has no protocol', () => {
    expect(normalizeDeploymentUrl('arina-agri.vercel.app')).toBe('https://arina-agri.vercel.app');
  });

  it('removes a trailing slash', () => {
    expect(normalizeDeploymentUrl('https://arina-agri.vercel.app/')).toBe('https://arina-agri.vercel.app');
  });
});

describe('checkDeployment', () => {
  it('passes when health is OK and cron is protected', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    await expect(
      checkDeployment({
        deploymentUrl: 'https://preview.vercel.app',
        fetchImpl,
        timeoutMs: 50,
      }),
    ).resolves.toEqual({
      healthUrl: 'https://preview.vercel.app/api/health',
      cronUrl: 'https://preview.vercel.app/api/cron/news',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails when health endpoint is not successful', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ success: false }, { status: 500 }));

    await expect(
      checkDeployment({
        deploymentUrl: 'https://preview.vercel.app',
        fetchImpl,
        timeoutMs: 50,
      }),
    ).rejects.toThrow('Health check failed with HTTP 500');
  });

  it('fails when cron endpoint is publicly accessible', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    await expect(
      checkDeployment({
        deploymentUrl: 'https://preview.vercel.app',
        fetchImpl,
        timeoutMs: 50,
      }),
    ).rejects.toThrow('Cron protection check failed: expected HTTP 401, got 200');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest tests/scripts/smokeDeploy.test.ts
```

Expected: FAIL with module not found for `@/scripts/smoke-deploy.mjs`.

- [ ] **Step 3: Implement the smoke script**

Create `scripts/smoke-deploy.mjs`:

```js
import { pathToFileURL } from 'node:url';

export function normalizeDeploymentUrl(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('DEPLOYMENT_URL is required.');
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('DEPLOYMENT_URL is required.');
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkDeployment({
  deploymentUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required.');
  }

  const baseUrl = normalizeDeploymentUrl(deploymentUrl);
  const healthUrl = `${baseUrl}/api/health`;
  const cronUrl = `${baseUrl}/api/cron/news`;

  const healthResponse = await fetchWithTimeout(fetchImpl, healthUrl, timeoutMs);
  if (!healthResponse.ok) {
    throw new Error(`Health check failed with HTTP ${healthResponse.status}`);
  }

  const healthBody = await healthResponse.json().catch(() => null);
  if (!healthBody?.success) {
    throw new Error('Health check failed: response JSON did not include success=true');
  }

  const cronResponse = await fetchWithTimeout(fetchImpl, cronUrl, timeoutMs);
  if (cronResponse.status !== 401) {
    throw new Error(`Cron protection check failed: expected HTTP 401, got ${cronResponse.status}`);
  }

  return { healthUrl, cronUrl };
}

export async function run() {
  const result = await checkDeployment({
    deploymentUrl: process.env.DEPLOYMENT_URL,
  });

  console.log(`Health check passed: ${result.healthUrl}`);
  console.log(`Cron protection check passed: ${result.cronUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run the smoke script tests**

Run:

```bash
npx vitest tests/scripts/smokeDeploy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the package script test again**

Run:

```bash
npx vitest tests/scripts/packageScripts.test.ts
```

Expected: PASS because `smoke:deploy` now points to an existing script.

- [ ] **Step 6: Commit**

Run:

```bash
git add scripts/smoke-deploy.mjs tests/scripts/smokeDeploy.test.ts
git commit -m "test: add deployment smoke checks"
```

---

### Task 3: Add GitHub Actions CI/CD Workflow

**Files:**
- Create: `.github/workflows/ci-cd.yml`
- Create: `tests/scripts/cicdWorkflow.test.ts`

- [ ] **Step 1: Write the failing workflow static test**

Create `tests/scripts/cicdWorkflow.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the workflow test to verify it fails**

Run:

```bash
npx vitest tests/scripts/cicdWorkflow.test.ts
```

Expected: FAIL because `.github/workflows/ci-cd.yml` does not exist yet.

- [ ] **Step 3: Create the CI/CD workflow**

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: arina-agri-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  NEXT_TELEMETRY_DISABLED: '1'
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co' }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-anon-key' }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY || 'ci-service-role-key' }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY || 'ci-gemini-key' }}
  GEMINI_MODEL: ${{ secrets.GEMINI_MODEL || 'gemini-2.5-flash' }}
  BMKG_FORECAST_CACHE_MINUTES: ${{ secrets.BMKG_FORECAST_CACHE_MINUTES || '30' }}
  BMKG_FETCH_TIMEOUT_MS: ${{ secrets.BMKG_FETCH_TIMEOUT_MS || '8000' }}
  CRON_SECRET: ${{ secrets.CRON_SECRET || 'ci-cron-secret' }}

jobs:
  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    timeout-minutes: 25

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Restore Next.js cache
        uses: actions/cache@v4
        with:
          path: ${{ github.workspace }}/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.json') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit tests
        run: npm run test

      - name: i18n check
        run: npm run i18n:check

      - name: Build
        run: npm run build

      - name: Bundle summary
        run: npm run perf:bundles

  preview-deploy:
    name: Preview Deploy
    runs-on: ubuntu-latest
    needs: quality
    timeout-minutes: 30
    if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Verify Vercel secrets
        run: |
          test -n "$VERCEL_TOKEN"
          test -n "$VERCEL_ORG_ID"
          test -n "$VERCEL_PROJECT_ID"

      - name: Pull Vercel preview environment
        run: npx vercel@latest pull --yes --environment=preview --token="$VERCEL_TOKEN"

      - name: Build preview artifact
        run: npx vercel@latest build --token="$VERCEL_TOKEN"

      - name: Deploy preview artifact
        id: deploy
        run: |
          npx vercel@latest deploy --prebuilt --token="$VERCEL_TOKEN" > deployment-url.txt
          deployment_url="$(tail -n 1 deployment-url.txt)"
          echo "url=$deployment_url" >> "$GITHUB_OUTPUT"
          echo "DEPLOYMENT_URL=$deployment_url" >> "$GITHUB_ENV"
          echo "Preview deployment: $deployment_url" >> "$GITHUB_STEP_SUMMARY"

      - name: Smoke check preview
        run: npm run smoke:deploy

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const marker = '<!-- arina-agri-preview-deploy -->';
            const url = '${{ steps.deploy.outputs.url }}';
            const body = `${marker}
            ### Arina Agri Preview Deployment

            Preview URL: ${url}

            Smoke checks passed.`;

            const { owner, repo } = context.repo;
            const issue_number = context.issue.number;
            const comments = await github.rest.issues.listComments({ owner, repo, issue_number });
            const existing = comments.data.find((comment) => comment.body?.includes(marker));

            if (existing) {
              await github.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner,
                repo,
                issue_number,
                body,
              });
            }

  production-deploy:
    name: Production Deploy
    runs-on: ubuntu-latest
    needs: quality
    timeout-minutes: 30
    if: (github.event_name == 'push' && github.ref == 'refs/heads/main') || (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main')
    environment:
      name: production
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Verify Vercel secrets
        run: |
          test -n "$VERCEL_TOKEN"
          test -n "$VERCEL_ORG_ID"
          test -n "$VERCEL_PROJECT_ID"

      - name: Pull Vercel production environment
        run: npx vercel@latest pull --yes --environment=production --token="$VERCEL_TOKEN"

      - name: Build production artifact
        run: npx vercel@latest build --prod --token="$VERCEL_TOKEN"

      - name: Deploy production artifact
        id: deploy
        run: |
          npx vercel@latest deploy --prebuilt --prod --token="$VERCEL_TOKEN" > deployment-url.txt
          deployment_url="$(tail -n 1 deployment-url.txt)"
          echo "url=$deployment_url" >> "$GITHUB_OUTPUT"
          echo "DEPLOYMENT_URL=$deployment_url" >> "$GITHUB_ENV"
          echo "Production deployment: $deployment_url" >> "$GITHUB_STEP_SUMMARY"

      - name: Smoke check production
        run: npm run smoke:deploy
```

- [ ] **Step 4: Run the workflow static test**

Run:

```bash
npx vitest tests/scripts/cicdWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .github/workflows/ci-cd.yml tests/scripts/cicdWorkflow.test.ts
git commit -m "ci: add github actions deployment pipeline"
```

---

### Task 4: Add Deployment Documentation and README Cleanup

**Files:**
- Create: `docs/deployment/github-actions.md`
- Modify: `README.md`

- [ ] **Step 1: Create deployment documentation**

Create `docs/deployment/github-actions.md`:

```md
# GitHub Actions CI/CD

Arina Agri deploys through GitHub Actions using Vercel CLI. GitHub Actions owns the CI/CD flow; Vercel remains the runtime platform.

## Required GitHub Secrets

Configure these repository or environment secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The production job uses the GitHub Environment named `production`. Add required reviewers there if production deploys should require manual approval.

## Required Vercel Environment Variables

Configure these values in the Vercel project for Preview and Production environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CRON_SECRET`
- `BMKG_FORECAST_CACHE_MINUTES`
- `BMKG_FETCH_TIMEOUT_MS`

Add Firebase, WhatsApp, Telegram, and n8n variables when those integrations are enabled in the target environment.

## Pull Request Flow

1. A pull request targeting `main` starts the `quality` job.
2. The quality job runs install, lint, typecheck, tests, i18n check, build, and bundle summary.
3. Pull requests from the same repository deploy to Vercel Preview after quality checks pass.
4. The workflow runs smoke checks against the preview URL.
5. The workflow creates or updates a PR comment with the preview URL.

Forked pull requests do not receive preview deployments because deployment requires repository secrets.

## Production Flow

1. A push to `main` starts the `quality` job.
2. If quality passes, the `production-deploy` job pulls the Vercel production environment.
3. The job builds with `vercel build --prod`.
4. The job deploys with `vercel deploy --prebuilt --prod`.
5. The job runs smoke checks against the production URL.

Manual production deploys can be started with `workflow_dispatch` from the `main` branch.

## Smoke Checks

`npm run smoke:deploy` reads `DEPLOYMENT_URL` and verifies:

- `GET /api/health` returns HTTP 200 with `success: true`.
- `GET /api/cron/news` returns HTTP 401 without credentials.

## Branch Protection

Recommended branch protection for `main`:

- Require pull request before merging.
- Require the `Quality Gate` status check.
- Require conversation resolution.
- Restrict who can push directly to `main`.
- Optional: require approval on the `production` GitHub Environment before production deployment.
```

- [ ] **Step 2: Update stale README script references**

In `README.md`, replace the "Tambahan perintah monorepo" block:

```md
Tambahan perintah monorepo:

```bash
# Build frontend saja
npm run build:web

# Build backend saja
npm run build:api

# Build keduanya
npm run build:all
```
```

with:

````md
Tambahan perintah proyek:

```bash
# Lint, typecheck, test, cek i18n, dan build seperti di CI
npm run ci

# Build produksi Next.js
npm run build

# Ringkasan ukuran bundle setelah build
npm run perf:bundles
```

CI/CD dijalankan lewat GitHub Actions. Lihat `docs/deployment/github-actions.md` untuk konfigurasi secret, preview deployment, production deployment, dan smoke check.
````

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/deployment/github-actions.md README.md
git commit -m "docs: document github actions deployment"
```

---

### Task 5: Full Verification

**Files:**
- None

- [ ] **Step 1: Run the focused CI/CD tests**

Run:

```bash
npx vitest tests/scripts/packageScripts.test.ts tests/scripts/smokeDeploy.test.ts tests/scripts/cicdWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 5: Run i18n check**

Run:

```bash
npm run i18n:check
```

Expected: PASS.

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Run the aggregate CI command**

Run:

```bash
npm run ci
```

Expected: PASS.

- [ ] **Step 8: Commit any verification-only fixes**

Only run this if verification revealed fixes that required code changes:

```bash
git add <changed-files>
git commit -m "fix: stabilize github actions ci pipeline"
```

---

## Self-Review Checklist

- Spec coverage: quality gate, preview deploy, production deploy, smoke checks, secrets, caching, docs, and security constraints are each covered by a task.
- Placeholder scan: no task contains unresolved placeholder language or unspecified validation.
- Type consistency: `checkDeployment`, `normalizeDeploymentUrl`, `smoke:deploy`, and workflow job names are consistent across tests, scripts, docs, and workflow.
- Scope check: this plan only creates CI/CD infrastructure. It does not change application behavior, database schema, or deployment platform.
