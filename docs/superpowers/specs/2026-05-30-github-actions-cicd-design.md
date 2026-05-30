# GitHub Actions CI/CD Design

Date: 2026-05-30

## Summary
Build a full CI/CD pipeline for Arina Agri using GitHub Actions as the orchestrator and Vercel CLI as the deployment mechanism. The first implementation should include quality gates, preview deployments for pull requests, production deployments from `main`, and post-deploy smoke checks.

## Goals
- Run a complete quality gate on pull requests and pushes to `main`.
- Deploy pull requests to Vercel Preview from GitHub Actions after quality checks pass.
- Deploy `main` to Vercel Production from GitHub Actions after quality checks pass.
- Run post-deploy smoke checks against the deployed URL.
- Keep the workflow maintainable and explicit so later teams can add security scans, e2e tests, or rollback automation.

## Non-Goals
- Replacing Vercel as the runtime platform.
- Changing application behavior or API contracts.
- Introducing Docker or a separate hosting target.
- Adding database migrations to the pipeline in the first pass.

## Current Project Context
- The app is a Next.js 16 App Router project with React 19 and TypeScript.
- `vercel.json` already defines Vercel Cron jobs for news, notifications, and prices.
- Tests use Vitest with `npm test`.
- Linting uses ESLint with `npm run lint`.
- There is no existing `.github/workflows` CI/CD workflow.
- `.npmrc` sets `legacy-peer-deps=true`, so `npm ci` should respect the same install mode in CI.
- Next.js 16 docs in `node_modules/next/dist/docs` recommend `next typegen && tsc --noEmit` for CI type checking and `.next/cache` persistence for GitHub Actions builds.

## Architecture
Use one GitHub Actions workflow at `.github/workflows/ci-cd.yml` with three jobs:

1. `quality`: installs dependencies, restores Next.js build cache, runs lint, typecheck, tests, i18n check, production build, and bundle summary.
2. `preview-deploy`: runs only for pull requests from this repository. It pulls Vercel preview environment configuration, builds with Vercel CLI, deploys prebuilt output, comments the preview URL on the PR, and runs smoke checks.
3. `production-deploy`: runs only for `main` push or manual dispatch on `main`. It pulls Vercel production environment configuration, builds with Vercel CLI using `--prod`, deploys prebuilt output with `--prod`, and runs smoke checks.

## Scripts
Add explicit npm scripts:

- `typecheck`: run `next typegen && tsc --noEmit --pretty false`.
- `ci`: run lint, typecheck, tests, i18n check, and build in the same order as CI.
- `smoke:deploy`: run a deployment smoke-test script.

Keep existing scripts such as `dev`, `build`, `start`, `lint`, `test`, `i18n:check`, and `perf:bundles`.

## Deployment Flow
Preview deployment:

1. Pull request opens or updates.
2. `quality` runs.
3. If the PR branch belongs to the same repository and Vercel secrets are available, `preview-deploy` runs.
4. Vercel CLI pulls preview env vars, builds locally in GitHub Actions, deploys prebuilt output, and returns a preview URL.
5. Smoke checks run against the preview URL.
6. The workflow posts or updates a PR comment with the preview URL and smoke status.

Production deployment:

1. Code is pushed to `main` or workflow is manually dispatched on `main`.
2. `quality` runs.
3. `production-deploy` pulls production env vars, builds locally in GitHub Actions, deploys prebuilt output to production, and returns the production URL.
4. Smoke checks run against the production URL.

## Smoke Checks
The smoke script receives `DEPLOYMENT_URL` and verifies:

- `GET /api/health` returns HTTP 200 and a JSON body with `success: true`.
- `GET /api/cron/news` without an authorization header returns HTTP 401, proving cron endpoints are still protected after deployment.

The script should fail fast with a clear error message and non-zero exit code.

## Required GitHub Secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Required Vercel Environment Variables
Store application runtime values in Vercel project environments:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CRON_SECRET`
- `BMKG_FORECAST_CACHE_MINUTES`
- `BMKG_FETCH_TIMEOUT_MS`
- Any Firebase, WhatsApp, Telegram, or n8n variables needed by enabled features.

CI quality checks may use safe placeholder values where build-time code only needs valid-looking values. Deploy jobs should use values pulled from Vercel environments.

## Security
- Do not use `pull_request_target` for deployment.
- Do not deploy previews for forked pull requests because repository secrets are not safe for untrusted code.
- Keep workflow permissions minimal: repository contents read access and pull request write access only for preview comments.
- Do not print secret values.
- Run cron protection smoke checks after every deployment.

## Caching
- Use `actions/setup-node` npm cache keyed by `package-lock.json`.
- Persist `.next/cache` using `actions/cache` with keys based on package lock and source files, following the Next.js 16 CI build caching guide.

## Documentation
Add deployment documentation describing:

- Required GitHub secrets.
- Required Vercel project link and environment variables.
- Branch protection recommendation.
- How preview and production deployments are triggered.
- How to manually dispatch a production deployment from `main`.

## Testing
- Unit-test the smoke script with mocked `fetch`.
- Add static workflow tests that verify the workflow contains required jobs, Vercel prebuilt deployment commands, and smoke command.
- Add a package script test that guards the CI-related npm scripts.
- Run the full local gate with `npm run ci`.

## Risks
- Forked PRs will not receive preview deploys. This is intentional for secret safety.
- Vercel CLI build may reveal missing production env values earlier than local `next build`. Mitigation: document required Vercel env vars and run deploy smoke checks.
- GitHub-hosted runner build time may be longer than cloud builds. Mitigation: enable npm and `.next/cache` caching.
