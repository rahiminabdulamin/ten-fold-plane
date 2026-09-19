# Copilot Month Events Reliability Design

## Goal

Make month-event answers accurate even when the underlying issue endpoint returns records outside the requested date range, and present the validated result without exposing internal tool chatter.

## Problem

The browser tool asks the Plane API for a `target_date__range`, then trusts every returned record and reports its array length. The assistant model independently reconstructs the answer. In production this allowed an October answer to include September records, claim 17 results while showing four, and duplicate lookup status lines in the chat.

The existing Copilot response-grounding evaluator is test-only. It does not constrain the rendered production result.

## Design

`list_month_events` remains the sole month lookup. It will defensively filter API records by their date-only `target_date` against its already-calculated inclusive month bounds. A pure helper will return only valid records, ordered by target date then name. The filtered array is the single source for both the announced count and tool payload.

The completed activity renderer will consume the structured tool result and render an authoritative event card. It displays the requested calendar month, an accurate total, readable dates, and the first five entries. If there are more than five, a native expandable details control reveals the remaining validated events and labels the preview as such. The preceding successful Workspace lookup is suppressed; loading and failure/uncertain rows remain visible.

The model prompt will direct the model to defer factual month-event lists to the rendered result card and only add a concise summary or follow-up assistance. This improves the conversational text but is not used as the correctness boundary.

## Constraints

- No API, database, model, dependency, or CI/CD changes.
- Preserve the current `list_month_events` tool name and request query.
- Date filtering must accept Plane date-only values and ISO timestamps, and exclude missing or malformed dates.
- The card must use semantic HTML and native `details`/`summary`; it needs no client state or new component dependency.
- Other work-item tools retain their current behavior.

## Testing

- Unit tests prove mixed September/October input yields October-only results, including ISO timestamps and malformed/null dates.
- Unit tests prove chronological ordering and leap-year month bounds remain correct.
- A UI source-contract test protects completed-status suppression and the event-card preview contract.
- Existing Copilot runtime and evaluation tests continue to pass.

## Acceptance Criteria

- No record outside the requested inclusive month range can be counted or rendered as a month event.
- The shown total is derived from exactly the rendered/expandable result collection.
- A result with more than five events says how many are initially shown and exposes every remaining validated event.
- The successful Workspace lookup no longer appears as a separate `Completed` message before the event card.
- Loading and failure activity remains visible.
