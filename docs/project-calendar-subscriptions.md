# Project calendar subscriptions

Project admins find **Calendar subscription** in **Project settings → General**.
Choose **Enable subscription**, then **Copy URL**. In an external calendar app,
choose its Subscribe by URL / From URL / From Internet option and paste the URL.
Importing an ICS file once does not create a subscription. The subscriber decides
when to refresh; Ten-Fold cannot force Outlook, Google Calendar, or Apple Calendar
to poll immediately.

The URL is a bearer secret. Anyone who possesses it can read dated issue titles
and descriptions, including those from a private project. The panel explains this
before publication. Only an active project admin with active workspace membership
can view or manage the URL.

**Disable** temporarily makes the URL unavailable; **Enable** restores the same
URL. **Rotate URL** replaces the secret, immediately invalidating the previous
URL for new requests. Subscribers must replace the URL. **Revoke subscription**
removes the feed; creating it again gives a new secret. Rotation and revocation
require inline confirmation. A request already admitted before rotation may finish
delivering its captured snapshot.

## Calendar contents

One project is one feed. Entries match the existing calendar range renderer:
issues need a due date (`target_date`); start date defaults to due date. The due
date is inclusive in Ten-Fold and becomes an exclusive ICS end date plus one day.
An inverted range exports as one day at the due date without modifying the issue.
Drafts, triage entries and archived issues are excluded; completed issues remain.
Cancelled states export `STATUS:CANCELLED`. Removing dates, deleting, archiving,
moving or hiding an existing entry leaves a retained cancellation in its old feed.

UIDs are permanent, and publication sequence is independent of issue identifiers.
Normal saves, bulk writes and deletions are tracked by PostgreSQL triggers. Normal
state changes that remain CONFIRMED, sort order, assignees and publication bookkeeping
do not advance sequence. Issue API and calendar date-editing behavior remain intact.

All-day dates remain dates in every subscriber timezone. Audit timestamps are UTC.
The serializer can also normalize timezone-aware timed entries to UTC, including
IANA/DST instants; the current issue calendar has date fields and publishes all-day
entries. No time-of-day editor or standalone event model has been added.

## Management API

Session-authenticated, CSRF-protected project-admin endpoint:

`/api/workspaces/{slug}/projects/{project_id}/calendar-feed/`

| Method            | Behavior                                                            |
| ----------------- | ------------------------------------------------------------------- |
| GET               | Returns feed details or JSON null when absent                       |
| POST              | Creates an opt-in feed; repeated creation returns the existing feed |
| PATCH             | Changes `enabled` and/or nullable `expires_at`                      |
| DELETE            | Revokes the feed (204)                                              |
| POST to `rotate/` | Rotates an existing token                                           |

Details include `url`, `enabled`, `expires_at` and `token_rotated_at`. The full URL
is constructed from configured `WEB_URL`; neither tenant IDs nor request-supplied
hosts are used in the public URL. Management responses containing URLs use no-store.
Expiry must be in the future when set; PATCH `expires_at: null` clears an expiry.

Public GET `/ics/{token}.ics` needs no session. Enabled, unexpired feeds of active
projects/workspaces return `text/calendar; charset=utf-8`; invalid, disabled,
expired, revoked, deleted or archived feeds return 404, even with conditional headers.
Only GET is supported on the public URL.

## Deployment and operation

- Apply migrations 0131–0134 before serving updated API workers. Existing feeds are
  opt-in; migrations do not publish any project automatically.
- Set `WEB_URL` to the public application origin, normally HTTPS. Standard and AIO
  Caddy configurations forward `/ics/*` to the API and skip access logging for these
  paths. Django, Gunicorn and Uvicorn filters redact feed paths. If an upstream CDN,
  load balancer or external APM captures full URLs, configure equivalent redaction
  or exclusion there.
- `CALENDAR_FEED_RETENTION_DAYS` defaults to 30 and accepts 1–3650. The feed excludes
  expired cancellations immediately; the daily Celery task cleans withdrawal rows
  at 02:00 UTC. Manual cleanup: `python manage.py clean_calendar_cancellations`.
- Migrations add nullable UID/change fields, backfill in 2000-row keyset batches,
  then enforce invariants. Initial schema/unique-index additions take PostgreSQL
  locks; schedule a maintenance window for very large installations. Migration 0133
  builds additional indexes concurrently. Take the normal database backup before
  schema migration. Full rollback removes feeds and publication metadata; existing
  subscription URLs cease working and must be recreated after reinstallation.
  Pause API and background writers for migrations 0131–0132; the UID backfill and
  constraint transition require a write maintenance window. Resume workers after
  all four migrations complete.
  State membership changes hold a shared state-row lock until commit so concurrent
  group edits cannot miss new or moved-in issues. Cleanup preserves a per-feed
  removal timestamp so Last-Modified never forgets removed cancellations.
- Generation uses a repeatable-read snapshot on the primary database, with bounded
  cursor batches. A 1 MiB spool spills to the API worker's temporary directory.
  Reserve disk capacity proportional to concurrent feed sizes. Network delivery
  starts after generation and database commit; slow subscribers do not hold DB
  transactions. ASGI uses native asynchronous 64 KiB transport blocks. Files close
  on completion, errors and disconnects, including disconnect during preparation.
- Weak ETags hash ordered publication metadata and calendar configuration; matching
  conditional requests skip body generation. Metadata scans are O(n), with bounded
  memory. If-None-Match takes precedence over If-Modified-Since. Date-only validators
  are conservative when subsecond changes cannot be represented by HTTP timestamps.
  Shared caches must not store feeds; responses require private revalidation.
- `last_accessed_at` records valid polls; `last_published_at` updates eligible issue
  rows in 1000-row batches only after full transport consumption. It does not prove
  that an external calendar applied the events.
- Structured logs report request outcomes, generation duration and event counts.
  OpenTelemetry instruments are `feed_requests_total`, `feed_generation_duration`,
  `feed_generation_errors`, `feed_cache_hits` and `feed_cache_misses`. Configure an
  OpenTelemetry SDK metric provider/exporter in API workers to collect them; without
  a provider, the API's standard no-op behavior applies. Bearer tokens are never
  metric labels.

## Verification

Backend tests are in `plane/tests/unit/test_icalendar_serializer.py`,
`test_calendar_publication.py`, `test_calendar_migrations.py`, and
`plane/tests/contract/app/test_calendar_feed.py`. `requirements/test.txt` includes
the standard `icalendar` parser. Run through the existing Docker test stack with
`pytest --migrations` for backfill/rollback coverage. The repository defaults to
`--nomigrations`; the publication fixture installs the same production trigger SQL
when needed so ordinary test runs also cover lifecycle behavior.

The slow contract test creates 100001 events and checks peak Python allocation
below 20 MiB and disk spill. Use `-m 'not slow'` for faster iterations.

The browser check uses real Chromium, the compiled component and service, and an
isolated in-memory HTTP fixture:

```sh
cd apps/web
node --test tests/calendar-subscription.test.mjs
```

Install Playwright in your test tooling and its Chromium browser first. If supplied
externally, set `PLAYWRIGHT_MODULE` to its ESM entry and optionally
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the browser binary. Build the web app first so
the harness can load its real CSS assets. `CALENDAR_SCREENSHOT_DIR` optionally
captures desktop/mobile panels. Existing web checks: `pnpm --filter web check:types`,
`pnpm --filter web build`, and calendar range/mobile regression tests.

See [sample output](examples/project-calendar.ics),
[design](superpowers/specs/2026-10-14-project-icalendar-design.md), and
[implementation plan](superpowers/plans/2026-10-14-project-icalendar.md).
