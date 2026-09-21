# Mobile Work-items Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the project work-items context bar from wrapping into the calendar controls at narrow mobile widths.

**Architecture:** Keep the shared header unchanged. Constrain only `IssuesHeader` so its breadcrumb container may shrink while its count, public badge, and creation action retain their intrinsic size.

**Tech Stack:** React, TypeScript, Tailwind responsive utilities, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-21-mobile-work-items-header-design.md`

## Global Constraints

- Modify only the project work-items header and its focused source-contract test.
- Add no dependencies and do not alter desktop behavior or header actions.
- Do not commit because the checkout contains unrelated user changes.

## Review Focus

- A long project breadcrumb must not displace the create action.
- The count and public badge must remain visible when present.
- The context row must not wrap beneath its fixed-height container.
- Desktop header filters must remain unaffected.
- The header must still work when count or public status is absent.

---

### Task 1: Keep the mobile work-items context row compact

**Files:**

- Create: `apps/web/tests/mobile-work-items-header.test.mjs`
- Modify: `apps/web/core/components/issues/header.tsx`

**Interfaces:**

- Consumes: existing `Header.LeftItem`, breadcrumb, count, public-status, and create-action markup.
- Produces: a single non-wrapping, shrinkable context cluster with non-shrinking secondary controls.

- [x] **Step 1: Write the failing source-contract test**

```js
assert.match(source, /<Header\.LeftItem className="min-w-0 flex-1 flex-nowrap overflow-hidden">/);
assert.match(source, /className="flex min-w-0 flex-nowrap items-center gap-2\.5 overflow-hidden"/);
assert.match(source, /className="min-w-0 flex-1 overflow-hidden"/);
assert.match(source, /className="shrink-0"/);
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test apps/web/tests/mobile-work-items-header.test.mjs`

Expected: FAIL because the existing header permits the left cluster to wrap.

- [x] **Step 3: Add the minimum layout constraints**

```tsx
<Header.LeftItem className="min-w-0 flex-1 flex-nowrap overflow-hidden">
  <div className="flex min-w-0 flex-nowrap items-center gap-2.5 overflow-hidden">
    <div className="min-w-0 flex-1 overflow-hidden">{/* breadcrumbs */}</div>
    <div className="shrink-0">{/* count */}</div>
    <a className="shrink-0">{/* public */}</a>
  </div>
</Header.LeftItem>
```

- [x] **Step 4: Run focused verification**

Run: `node --test apps/web/tests/mobile-work-items-header.test.mjs && pnpm --filter web check:types && git diff --check`

Expected: all commands exit 0.
