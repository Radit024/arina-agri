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

Add WhatsApp, and Telegram variables when those integrations are enabled in the target environment.

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
