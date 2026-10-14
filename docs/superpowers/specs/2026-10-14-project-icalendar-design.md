# Project iCalendar subscriptions

## Intent and scope

Publish one optional bearer-secret ICS feed per project so Outlook, Google Calendar,
Apple Calendar, and other consumers can subscribe to existing issue calendars.
The user selected project calendars. Preserve existing issue APIs, calendar rendering,
date editing, state transitions, and deletion behavior.

This is publishing, not importing remote calendars or two-way synchronization.
No workspace, user, module, cycle, or saved-view feeds. Deliver backend management
APIs, a project settings panel, deployment routing, tests, operator documentation,
and sample output.

### User access

Add a **Calendar subscription** section to Project settings → General, visible
only to project admins. Use existing settings typography, buttons, and layout.
Before creation, explain which issues are shared and offer **Enable subscription**.
After creation, display the full HTTPS URL in a labelled read-only field with
**Copy URL**, **Disable/Enable**, **Rotate URL**, and **Revoke subscription**.
Rotation and revocation require an inline confirmation that explains that current
subscriptions will stop updating. Never rotate silently on enable/disable.
Explain that anyone with the URL can read issue titles and descriptions, and that
users paste it into their calendar app's Subscribe by URL action. Refresh intervals
are controlled by the subscriber. Show loading, recoverable errors, and disabled
states; prevent duplicate mutations. The backend constructs the URL from the
configured public application origin, never an unvalidated request host.

## Options and recommendation

1. **Database-backed publication tracking (recommended):** additive issue fields and
   PostgreSQL triggers capture normal saves, queryset updates, bulk updates, and
   deletes consistently. A small cancellation table preserves withdrawn entries.
   More migration work, but no refactoring of existing issue mutation paths.
2. Application hooks: simpler initially, but every mutation path must be changed;
   existing bulk operations bypass model saves and signals.
3. Reconcile on feed reads: avoids mutation hooks, but scans and writes the entire
   calendar on polling, complicates concurrency, and delays change tracking.

## Calendar mapping

- Match the existing range renderer: require `target_date`; use `start_date` when
  present, otherwise `target_date`. A start-only issue does not currently appear
  in that renderer and will not be exported.
- Export `DTSTART;VALUE=DATE` and exclusive `DTEND;VALUE=DATE` (due date plus one
  day). Clamp an inverted range to a one-day event at the due date, without editing
  the issue. Include completed issues; exclude drafts, triage, and archived issues.
- Issue name becomes SUMMARY; sanitized plain text from description HTML becomes
  DESCRIPTION. LOCATION is empty because issues have no location field.
- Cancelled state maps to CANCELLED; other states map to CONFIRMED. Do not repurpose
  existing `sequence_id`, which identifies issues within a project.
- Date-only entries must retain their dates in all subscriber timezones. Audit
  timestamps serialize as UTC. The serializer also accepts timezone-aware timed
  entries and normalizes UTC/IANA instants to UTC; no VTIMEZONE is needed for UTC
  timestamps or DATE values. No new time-of-day editor or issue timezone field.

## Persistence and lifecycle

Create `calendar_feeds` with UUID primary key, unique project FK (the calendar),
secure unique token, enabled flag, creator FK, created/updated/access timestamps,
nullable expiry and rotation timestamps, and required indexes. One project has
at most one feed; feed creation is opt-in.

Add immutable unique `ical_uid`, integer `ical_sequence`, publication-change
timestamp, nullable `ical_cancelled_at`, and nullable `last_published_at` to issues.
Generate permanent identities using UUIDs and a fixed Ten-Fold UID namespace;
never derive them from a mutable hostname or project name. Index project/change
timestamp and cancellation queries; retain existing date/deletion indexes and
add missing required indexes after inspecting the schema.

Reversible PostgreSQL triggers enforce UID immutability and advance sequence only
for changes to exported title, description, dates, status, or membership. Metadata,
sort order, assignees, analytics, and publication bookkeeping do not advance it.
State-group edits must update affected publication status even without issue saves.
Membership changes hold a shared state-row lock until commit; derived state metadata
from stale model instances is ignored unless the nested state trigger is updating it.
Track changes atomically under concurrent writes and honor actual persisted fields.
Trigger logic must not change existing issue state, identifiers, or timestamps.

Store the last exportable snapshot in `calendar_feed_cancellations` when an issue
leaves its project calendar: deletion, hard deletion, archive, draft/triage conversion,
date removal, or project move. Keep its UID and a newer sequence. Cancelled-state
issues retain cancellation timestamps directly. Reappearance clears the applicable
withdrawal record and uses a newer sequence. Moving an issue cancels it in the old
project and publishes its permanent identity in the new project.

Cancellation retention defaults to 30 days via a validated setting. The feed omits
expired cancellations; scheduled cleanup removes snapshots after retention. Do
not depend on issue cleanup preserving deleted rows. Repeated edits to a cancelled
entry do not indefinitely restart retention; restoring and cancelling starts a new
period. Project/workspace deletion or archival immediately makes the feed unavailable.

Backfill UIDs and publication fields in bounded batches. Existing opted-out projects
have no feed URLs. Migration and rollback tests cover triggers and backfill behavior.

## Endpoints and security

Authenticated `/api/workspaces/{slug}/projects/{project_id}/calendar-feed/` supports
GET, POST (create), PATCH (enable/disable and expiry), DELETE (revoke), plus POST to
`calendar-feed/rotate/`. Require active workspace membership and active project
admin membership on every operation, including GET because it reveals the token.
Resolve the project within the supplied workspace; public project visibility does
not grant feed administration. Use existing session authentication and CSRF rules.

Use `secrets.token_urlsafe(32)` (256 bits entropy). Mutation operations are atomic;
rotation immediately invalidates the old token, and revocation removes it. Re-enable
preserves the token; recreating a revoked feed creates a new token.

Public GET `/ics/{token}.ics` checks token syntax, enabled/expiry, and live project
and workspace on the primary database before any conditional response. Invalid,
disabled, expired, revoked, or unavailable feeds return indistinguishable 404s.
Never put tenant IDs in public URLs or tokens in application logs or metric labels.
Route `/ics/*` to Django in both standard and all-in-one Caddy configurations;
redact that path in request/access logging. Responses require revalidation and
must not be stored in shared caches; include a no-referrer policy.

## Serialization, streaming, and validators

Emit VERSION:2.0, Ten-Fold PRODID, CALSCALE:GREGORIAN, METHOD:PUBLISH and escaped
project name. Each VEVENT has UID, DTSTAMP, SUMMARY, DESCRIPTION, LOCATION,
DTSTART, DTEND, CREATED, LAST-MODIFIED, SEQUENCE, STATUS. Use CRLF, escape TEXT,
and fold at 75 UTF-8 octets without splitting characters. Deterministic ordering
and timestamps make identical exports byte-stable.

Use a bounded database iterator and serialize one event at a time into a temporary
file, spilling to disk beyond 1 MiB. Compute validators and build the file inside
one repeatable-read snapshot, then close the database transaction before streaming
the file to the subscriber. This bounds memory and avoids holding a database cursor
or transaction during slow network delivery. Under ASGI use an asynchronous file
iterator; under WSGI use a synchronous iterator. Close the file on completion,
disconnect, or error. Conditional matches skip file generation entirely.

Compute validators from indexed publication metadata, count, project/feed metadata,
serializer version, retention configuration, and the eligible cancellation set.
Retention expiry must change validators even with no writes. Cleanup retains a
per-feed removal watermark so date validators cannot forget expired cancellations. ETag is weak if based
on metadata; do not claim a byte hash. Last-Modified includes creation, publication,
withdrawal, and retention-removal times. Avoid false 304s for multiple changes in
the same HTTP timestamp second; when date-only validation is ambiguous return 200.
If-None-Match takes precedence over If-Modified-Since, including lists, weak tags,
and wildcard. Authenticate the feed first. A valid match returns 304 with validators.

Update last_accessed_at without invalidating content. last_published_at records
successful full-feed publication bookkeeping in bounded updates and does not
advance sequence or ETag. A failed or disconnected stream must not record success.

## Observability and verification

Use installed OpenTelemetry counters `feed_requests_total`, `feed_generation_errors`,
`feed_cache_hits`, `feed_cache_misses`, and histogram `feed_generation_duration`.
Structured logs report outcome, duration, and event count without bearer secrets.
Record streaming completion/errors inside the generator, including disconnects.

Unit tests cover escaping, Unicode folding, dates, UTC/IANA and DST accuracy,
timestamps, statuses, and header parsing. Integration tests cover tenant/admin
boundaries, creation, rotation, revoke, disabled/expired URLs, all mutation paths,
immutable UID, concurrent sequence updates, cancellations and retention, restored
and moved issues, conditional precedence, same-second changes, and bookkeeping.
Contract tests parse output using the standard `icalendar` parser (test dependency).
Exercise a 100k-entry calendar with bounded memory/query checks and the deployed
ASGI streaming path. Run existing relevant issue, state, project, deletion, and
calendar checks; record any unavailable infrastructure honestly.

Provide a sample ICS and operator instructions covering secret URLs, rotation,
retention, routes, migration locks, and subscriber-controlled refresh intervals.
Successful HTTP delivery does not prove a subscriber consumed the feed.

## Standards reference

[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html), especially content lines,
TEXT escaping, VEVENT requirements, DATE/DATE-TIME, DTEND, UID, and SEQUENCE.

## Review boundary

The user approved proceeding with detailed specifications, an implementation plan,
and inline execution in the current checkout on 2026-10-14. The UI and temporary-file
streaming refinements above are implementation decisions within that authorization.
