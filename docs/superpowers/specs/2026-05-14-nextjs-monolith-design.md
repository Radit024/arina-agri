# Next.js Monolith Migration Design (Vercel Serverless)

Date: 2026-05-14

## Summary
Migrate the existing Express backend into Next.js App Router Route Handlers to form a single monolith deployed on Vercel serverless. All API paths remain unchanged. Scheduled jobs move to Vercel Cron endpoints. Notification schedule storage moves from local file to Supabase.

## Goals
- Replace Express backend with Next.js Route Handlers.
- Keep all API paths and response shapes compatible.
- Move schedulers to Vercel Cron with serverless-safe code.
- Store notification schedule in Supabase instead of local file.

## Non-Goals
- Changing frontend UI behavior or API semantics.
- Reworking Supabase schema beyond required schedule table.
- Introducing new third-party services beyond Vercel Cron.

## Architecture
- Next.js App Router serves UI and API in one repo.
- API logic lives in server-only modules (e.g., `lib/server/*`).
- Route handlers in `app/api/**/route.ts` map 1:1 with current Express paths.
- Read Next.js docs in `node_modules/next/dist/docs/` before implementation to respect breaking changes.

## API Mapping (unchanged paths)
- `POST /api/ai/gemini`
- `POST /api/ai/financial-report`
- `GET /api/news`
- `POST /api/news/trigger`
- `POST /api/notification/send`
- `GET /api/notification/schedule`
- `POST /api/notification/schedule`
- `POST /api/notification/decide`
- `POST /api/notification/decide-send`
- `POST /api/webhook/n8n`
- `GET /api/health`

## Scheduler and Cron
- Use Vercel Cron to call internal cron endpoints (e.g., `GET /api/cron/news`, `GET /api/cron/notifications`, `GET /api/cron/prices`).
- Each cron endpoint validates `Authorization: Bearer ${CRON_SECRET}`.
- Target Vercel Hobby/free cron limits: each cron job must run at most once per day, with hourly scheduling precision. Do not use hourly, multi-hour, or `*/5` cron expressions on Hobby because deployment will fail.
- Keep tasks split across daily cron endpoints to avoid long execution and timeouts:
  - `GET /api/cron/news`: `0 0 * * *` (daily around 07:00 Asia/Jakarta; Vercel cron uses UTC).
  - `GET /api/cron/notifications`: `0 0 * * *` (daily around 07:00 Asia/Jakarta; allow up to 60 minutes of schedule tolerance for Hobby precision).
  - `GET /api/cron/prices`: `0 2 * * *` (daily around 09:00 Asia/Jakarta).

## Notification Schedule Storage
- Replace `backend/data/notificationSchedule.json` with Supabase table `notification_schedules`.
- Fields: `id`, `enabled`, `time`, `timezone`, `platform`, `to`, `recipient_name`, `custom_message`, `user_id`, `last_sent_at`, `created_at`, `updated_at`.
- On Vercel Hobby/free, notification cron runs once daily and selects due schedules by timezone, `time`, and `last_sent_at` to avoid duplicates. Because Hobby cron precision is hourly, due checks use a 60-minute tolerance. More frequent or exact-time notifications require Vercel Pro or an external scheduler.

## Price Scraper
- Serverless-safe scraping with `puppeteer-core` + `@sparticuz/chromium` (Node.js runtime).
- If scraping fails, skip write (no simulated data).
- Upsert into `commodity_prices` with existing constraint.

## News Fetch
- Parallelize RSS fetches with `Promise.all`.
- Cleanup remains 30 days.
- Upsert by `link` to remain idempotent.

## Security and Env
- Server-only env vars: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `N8N_WEBHOOK_SECRET`, `CRON_SECRET`.
- Public env remains limited to `NEXT_PUBLIC_*` only.

## Observability and Error Handling
- Maintain consistent JSON response shape: `success`, `message`, `data`.
- Log minimal error details without secrets.

## Testing
- Smoke tests for the main endpoints.
- Add a test that cron endpoints reject missing/invalid auth.

## Migration Notes
- Remove backend folder runtime usage and related scripts (`dev:api`, `build:api`, `start:api`).
- Remove Express and node-cron dependencies from root and backend.
- Ensure Supabase clients used in server-only modules.

## Risks
- Serverless timeouts on long scraping tasks. Mitigation: dedicated cron endpoint and optimized scraping.
- Scheduler duplicate sends. Mitigation: `last_sent_at` and timezone-based due checks.
