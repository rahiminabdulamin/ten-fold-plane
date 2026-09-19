# Copilot Month Events Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent month-event answers from counting or showing records outside the requested calendar month, while displaying the validated result cleanly.

**Architecture:** Keep the existing frontend tool and API query. Add one pure normalizer/filter in the tool-contract module, then use it as the only source for `list_month_events` count and data. Extend the existing activity renderer with a semantic result card and suppress generic completed rows.

**Tech Stack:** TypeScript, React, Vitest, Node test runner, native HTML `details`.

**Spec:** `docs/superpowers/specs/2026-09-19-copilot-month-events-design.md`

## Global Constraints

- Do not add dependencies, models, API endpoints, database changes, or deployment changes.
- Keep `list_month_events` and `target_date__range` intact.
- Exclude records without a valid target date and sort accepted records by target date then name.
- Preview five events and reveal the rest with native `details`.

---

### Task 1: Establish a trustworthy month-event collection

**Files:**

- Modify: `apps/web/core/components/copilot/tool-contracts.ts`
- Modify: `apps/web/core/components/copilot/tool-contracts.test.ts`

**Interfaces:**

- Produces: `filterMonthEventRecords(records, dateFrom, dateTo)` returning date-valid work-item records in deterministic order.
- Consumes: `toWorkItemRecords()` output and ISO/date-only target dates.

- [ ] **Step 1: Write failing tests**

```ts
expect(filterMonthEventRecords(records, "2026-10-01", "2026-10-31").map(({ id }) => id)).toEqual([
  "october-first",
  "october-last",
]);
```

Include a September record, a November record, a missing target date, a malformed date, and an ISO October timestamp.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @plane/web test -- core/components/copilot/tool-contracts.test.ts`

Expected: failure because `filterMonthEventRecords` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Extract the leading `YYYY-MM-DD` only when it matches a valid calendar date, filter inclusively, and sort by date then `name.localeCompare`.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter @plane/web test -- core/components/copilot/tool-contracts.test.ts`

Expected: exit 0.

### Task 2: Use and display the validated collection

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Consumes: `filterMonthEventRecords`.
- Produces: `list_month_events` tool data with `{ month, year, total, events }` and an activity card for a successful result.

- [ ] **Step 1: Write failing UI source-contract tests**

Assert the source contains `filterMonthEventRecords`, `data-testid="copilot-month-events"`, and a `details` preview path, and does not render a generic completed row without a parsed message.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @plane/web test -- tests/ui-refinements.test.mjs`

Expected: failure because the card and filtered-result path do not exist.

- [ ] **Step 3: Implement the smallest renderer**

Parse the existing JSON tool result once. For a completed month-event result, render a semantic section with an accurate total, readable date labels, five-item preview, and native expandable remainder. Return `null` for other completed successful lookup rows. Continue rendering active/failure states.

- [ ] **Step 4: Connect the tool**

Filter `toWorkItemRecords(issues)` before logging, counting, and returning. Return only `{ month, year, total, events }` for `list_month_events`. Add the concise runtime rule that the card is authoritative for month-event facts.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm --filter @plane/web test -- tests/ui-refinements.test.mjs`

Expected: exit 0.

### Task 3: Regression verification

**Files:**

- Verify: `apps/web/core/components/copilot/tool-contracts.test.ts`
- Verify: `apps/web/tests/ui-refinements.test.mjs`
- Verify: `apps/copilot/src/runtime.test.ts`
- Verify: `apps/copilot/src/evals/scenarios.test.ts`

- [ ] **Step 1: Run focused verification**

```bash
pnpm --filter @plane/web test -- core/components/copilot/tool-contracts.test.ts
pnpm --filter @plane/web test -- tests/ui-refinements.test.mjs
pnpm --filter @plane/copilot test -- src/runtime.test.ts src/evals/scenarios.test.ts
pnpm --filter @plane/web check:types
```

- [ ] **Step 2: Review the diff**

Run: `git diff --check && git diff -- apps/web/core/components/copilot/tool-contracts.ts apps/web/core/components/copilot/root.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/core/components/copilot/tool-contracts.ts apps/web/core/components/copilot/tool-contracts.test.ts apps/web/core/components/copilot/root.tsx apps/web/tests/ui-refinements.test.mjs apps/copilot/src/runtime.ts docs/superpowers/specs/2026-09-19-copilot-month-events-design.md docs/superpowers/plans/2026-09-19-copilot-month-events-reliability.md
git commit -m "fix: make copilot month events deterministic"
```
