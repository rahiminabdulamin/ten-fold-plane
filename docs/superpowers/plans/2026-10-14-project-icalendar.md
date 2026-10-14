# Project iCalendar Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Execute inline in the current checkout, as requested by the user.

**Goal:** Let project admins publish and manage secure subscriptions to existing issue calendars.

**Architecture:** Add PostgreSQL-backed issue publication metadata and cancellation snapshots, with triggers covering all existing mutation paths. Generate deterministic RFC5545 feeds into bounded temporary files and stream with sync/async iterators. Add an admin-only subscription panel to existing General project settings.

**Tech Stack:** Django 5.2, PostgreSQL, existing DRF/session authentication, Python standard library, installed OpenTelemetry, React/TypeScript and existing Plane components. `icalendar` is a test-only parser.

**Spec:** `docs/superpowers/specs/2026-10-14-project-icalendar-design.md`

## Global constraints

- Current checkout; no new worktree, shared push, deploy, or application database mutation.
- One optional feed per project; no other feed scopes or calendar import.
- Preserve issue `sequence_id`, state changes, date editing, calendar rendering, and deletion semantics.
- 32 bytes of token entropy; 30-day configurable cancellation retention; primary database token validation.
- All-day DATE values, exclusive end dates, UTC audit timestamps, immutable UID, subscriber-visible sequence updates only.
- Bounded iteration, 1 MiB spool threshold, snapshot-consistent validators, asynchronous ASGI streaming.
- Secret-free logs and metric labels; admin-only management including URL reads.

## Review focus

- Bulk operations and state-group edits must update publication metadata without model hooks (Task 2).
- Removing dates, moving issues, and hard deletion must leave cancellable snapshots (Task 2).
- Same-second changes and retention expiry must not produce false 304s (Task 3).
- Disconnects and ASGI must close temporary files without buffering the full feed (Task 3).
- Navigation changes, failed clipboard access, and concurrent actions must not show stale secrets (Task 4).

## Task 1: RFC5545 serializer

**Files:** `apps/api/plane/utils/icalendar.py`, `apps/api/plane/tests/unit/test_icalendar_serializer.py`.
**Interface:** `serialize_event(event: Mapping) -> bytes`, `calendar_header(name: str) -> bytes`, `calendar_footer() -> bytes`.

- [x] Write tests asserting parsed UID, SEQUENCE, UTC timestamps, DATE ranges, empty location, escaping, 75-octet Unicode folding, and IANA/DST timed conversion.
- [x] Run tests and observe missing serializer failure.
- [x] Implement stateless standard-library serialization, including DTSTAMP and input validation.
- [x] Run unit/contract parser tests to green and commit this deliverable.

## Task 2: Feed models, publication metadata and migrations

**Files:** `apps/api/plane/db/models/calendar_feed.py`, issue model and model exports; `0131_project_calendar_feeds.py`, `0132_calendar_publication_tracking.py`; `apps/api/plane/tests/unit/test_calendar_publication.py`.
**Interface:** `CalendarFeed`, `CalendarFeedCancellation`; issue `ical_uid`, `ical_sequence`, `ical_changed_at`, `ical_cancelled_at`, `ical_state_group`, `last_published_at`.

- [x] Write database tests: title change advances sequence; sort order does not; UID modification rejected; bulk operations/state-group edits covered; withdrawal snapshot survives delete, move and undating; restore is newer.
- [x] Observe failures before adding schema and triggers.
- [x] Add one-feed-per-project model, cancellation snapshot model and indexes. Add nullable fields, batch backfill, then constraints/defaults. Install reversible BEFORE issue and state-group triggers. Keep snapshot creation conditional on feed existence.
- [x] Apply migrations only to the isolated test database. Run with migrations enabled, schema drift check and publication tests. Commit.

## Task 3: Management, public endpoint, cache, metrics and deployment routing

**Files:** `apps/api/plane/app/views/project/calendar_feed.py`, `apps/api/plane/utils/calendar_feed.py`, management URL registrations, root URL, settings, logger middleware, Caddyfiles, test requirements; `apps/api/plane/tests/contract/app/test_calendar_feed.py`.
**Interface:** management API returns `{url, enabled, expires_at, token_rotated_at}` or null; public `/ics/{token}.ics` returns 200/304/404; spool service owns database snapshot and file lifecycle.

- [x] Write endpoint tests for admin and workspace isolation, create/read/disable/re-enable/expiry/rotation/revoke, ICS parser output, ETag and timestamp validators, precedence, same-second updates, cancellation expiry, metadata stability, redacted logs, streaming cleanup and generation failure.
- [x] Observe missing endpoints/service failures.
- [x] Implement atomic management with strict serializer validation and configured public origin. Build feeds under repeatable-read on primary; spool generation and bounded transport with OpenTelemetry and secret-free logs. Bookkeep only successful completed deliveries without touching representation metadata.
- [x] Wire root and app routes, Caddy forwarding and secret redaction, validated settings, bounded cancellation cleanup command. Test 100k rows and real ASGI response path; commit.

## Task 4: Project settings subscription panel

**Files:** `apps/web/core/services/calendar-feed.service.ts`, `apps/web/core/components/project/settings/calendar-subscription.tsx`, General settings route; `apps/web/tests/calendar-subscription.test.mjs`.
**Interface:** typed service uses existing `APIService`; panel takes `workspaceSlug` and `projectId`, renders only for project admins via existing permission guard.

- [x] Add tests for service request paths and rendered controls, create/copy/toggle, inline rotate/revoke confirmations, error/retry, busy states and project-change stale response protection.
- [x] Observe missing component/service failures.
- [x] Implement panel using existing Button, Input, settings layout and toast conventions. Label secret URL and explain access and subscription steps. Keep UI inside General settings without new navigation infrastructure.
- [x] Run web tests, lint and type checks; inspect desktop/mobile in one browser pass when available, fix any observed defects, and commit.

## Task 5: Regression verification and documentation

**Files:** `docs/project-calendar-subscriptions.md`, `docs/examples/project-calendar.ics`, plan status.

- [x] Run new tests and existing issue/state/project/deletion and calendar tests appropriate to changed behavior.
- [x] Verify migration forward/reverse, no schema drift, bounded 100k generation and async delivery, Python compilation, formatting, lint/types.
- [x] Document management, URL secrecy, subscriber setup, configuration, retention cleanup, migration/backfill locking and resource bounds; generate sample output with the serializer.
- [x] Review final changes against the spec, fix material findings with regression tests, and record actual results and limitations.
- [x] Commit deliverables and report concise completion with any unavailable checks; do not deploy or push.

## Execution record

Executed inline on the existing `preview` checkout.

- Backend: 95 selected checks passed, including existing project/issue permission and serializer/filter regressions, lifecycle/concurrency, real ASGI streaming/disconnects, metrics, migration backfill/rollback, and 100001-event bounded generation.
- Default migration-skipping mode: 42 passed; historical migration test intentionally skipped; slow scale test deselected.
- Existing calendar: 13 range tests and 14 mobile tests passed.
- Chromium: subscription lifecycle, secret copy, clipboard denial, duplicate mutation guard, lost-response recovery, project switching and desktop/mobile overflow checks passed.
- Web production build, type checks, targeted lint, Python compilation and standard/AIO Caddy adaptation passed.
- Schema dry-run still reports four unrelated defaults present before this work: profile week start, user/workspace timezones, navigation preference. No calendar drift.
- Independent read-only review found state-membership concurrency and cleanup/date-validator bugs. Both reproduced and fixed with regression tests. A stale-instance reverse-lock regression and disconnect telemetry were also fixed. No review findings remain deferred.

Decisions: work remained in the current checkout as requested; generation spools at 1 MiB before network delivery to bound memory and DB transaction lifetime; validators scan indexed metadata in O(n) to avoid per-project write contention. These choices trade disk/first-byte latency and linear metadata scans for bounded resource use and accurate updates.

Deployment requires applying migrations 0131–0134 in a write maintenance window and configuring the public WEB_URL. Metric export uses the deployment's OpenTelemetry SDK/provider. No application database was changed during implementation; PostgreSQL and the task broker used for verification were isolated test resources.
