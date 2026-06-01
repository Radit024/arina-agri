# BMKG Weather Notifications Without n8n Design

Date: 2026-06-01

## Summary
Enable scheduled weather notifications without n8n by using the existing Next.js backend, Vercel Cron, BMKG weather data, the current rule-based notification decision engine, and direct WhatsApp or Telegram channel senders. The notification remains a daily summary, but becomes a priority alert when BMKG weather or warning data crosses the existing risk threshold. AI may be used to write practical activity suggestions, while the send decision stays deterministic.

## Goals
- Run weather notifications without outbound n8n workflows.
- Use BMKG forecast and warning data for scheduled notifications instead of the current static default weather snapshot.
- Support the selected mode: daily summary plus priority alert when risk is high.
- Add AI-generated activity suggestions based on weather, BMKG warnings, and today's calendar events.
- Keep direct sending through WhatsApp Cloud API and Telegram Bot API.

## Non-Goals
- Removing the existing n8n webhook endpoint used by other integrations.
- Replacing the rule engine with AI decision-making.
- Adding a new third-party scheduler beyond the existing Vercel Cron endpoint.
- Building a separate notification inbox or delivery analytics dashboard.

## Current State
- `/api/notification/decide-send` already sends directly through `sendDirectNotification`, so outbound weather notifications do not need n8n.
- `/api/cron/notifications` already processes enabled rows in `notification_schedules`.
- Scheduled processing currently passes a static weather payload (`cerah`, `28C`, no rain, light wind), so scheduled notifications are not yet based on live BMKG data.
- The weather dashboard already loads BMKG forecast and warnings for the active GPS/BMKG location, but that location is stored client-side and is not persisted with the schedule row.

## Architecture
- The user selects or resolves a weather location in the weather page.
- When saving a schedule, the frontend sends the selected BMKG `adm4` code and location label together with the existing schedule payload.
- The schedule endpoint stores the location fields in `notification_schedules`.
- Vercel Cron calls `/api/cron/notifications`.
- `processScheduledNotifications` loads due schedules, fetches BMKG forecast and warnings for each schedule location, converts the current BMKG slot into the notification weather snapshot, loads today's calendar events, then calls `buildNotificationDecision`.
- If the decision says to send, the backend calls `sendDirectNotification` directly.

## Data Model
Add nullable columns to `notification_schedules`:
- `weather_adm4 text`: BMKG village-level location code.
- `weather_location_label text`: human-readable location name shown in the message.

When a schedule is enabled, `weather_adm4` should be required by validation. Disabled schedules may be saved without a location so users can turn notifications off without fixing old data.

## Notification Behavior
- Daily summary mode always uses `metadata.forceSend = true` for due schedules, so the user receives the scheduled daily message.
- The same message includes the rule-engine risk score and level.
- If risk is `sedang`, `tinggi`, or `ekstrem`, the message opening becomes an alert-style warning.
- If risk is `rendah`, the message stays a normal daily planning summary.
- BMKG warnings are passed into the decision engine so regional warnings can raise the message priority.

## BMKG Weather Mapping
Use `getBmkgForecast({ adm4, locationLabel })` and `getBmkgWarnings()` from the existing server weather module.

The forecast current slot should map into the decision input:
- `kondisi`: BMKG current condition text.
- `suhu`: current temperature.
- `kelembapan`: current humidity.
- `curahHujan`: current precipitation estimate if available, otherwise `0`.
- `kecepatanAngin`: current wind speed.
- `lokasi`: schedule `weather_location_label` or forecast location label.

If BMKG forecast fetch fails for a due schedule, the cron result should record a skipped or failed item and avoid sending a misleading weather notification. It should not fall back to fabricated safe weather.

## AI Activity Suggestions
AI suggestions can be applied safely if they are treated as message-writing support, not as the authority for sending.

The AI receives:
- normalized weather snapshot,
- risk level and triggered rules,
- BMKG warnings,
- today's calendar events,
- optional custom message from the schedule.

The AI returns a concise Indonesian activity suggestion block, such as whether to water, spray, fertilize, harvest, dry produce, inspect drainage, or postpone field work. The prompt must instruct AI not to invent weather facts, not to override risk level, and not to recommend unsafe work during severe weather. If Gemini is unavailable, the system falls back to deterministic recommendations already produced by the rule engine.

## Error Handling
- Missing `weather_adm4` on an enabled schedule returns a validation error when saving.
- Existing enabled schedules without `weather_adm4` are skipped by cron with a clear result reason.
- Channel errors keep the existing behavior: return the provider error and do not update `last_sent_at`.
- Successful sends update `last_sent_at` to prevent duplicate daily notifications.
- Logs must not print channel tokens, Supabase service keys, or complete authorization headers.

## Testing
- Add unit tests for schedule validation with and without `weather_adm4`.
- Add unit tests for mapping BMKG current forecast into notification weather input.
- Add tests for cron processing that mock BMKG forecast, warnings, Supabase schedules, and direct channel sending.
- Add a regression test that scheduled notifications no longer use the static default weather snapshot.
- Keep existing direct send behavior for `/api/notification/decide-send`.

## Rollout
- Add database migration for the new schedule location columns.
- Update schedule save and load APIs to include location fields.
- Update the weather page schedule save payload to send active BMKG location.
- Update cron processing to fetch BMKG data per due schedule.
- Verify Telegram and WhatsApp paths through the existing direct channel services.
