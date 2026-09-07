# Published View Ten-Fold Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand public Published project views as Ten-Fold, keep them light, and make their enabled Calendar layout usable.

**Architecture:** Keep the public app self-contained: its root provider fixes the visual theme, a local loader owns its branding asset, and the public issues layout selects a small read-only month grid. The existing public issue store remains the data source, so neither API contracts nor publishing settings change.

**Tech Stack:** React Router, React, MobX, next-themes, date-fns, Tailwind CSS, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-07-published-view-ten-fold-branding-design.md`

## Global Constraints

- Do not change publish API contracts, stored project logos, or workspace/project data.
- Do not add public editing, drag-and-drop, or layouts beyond Calendar.
- Do not alter unrelated web, API, or Copilot changes in the checkout.
- Use existing dependencies only.

---

### Task 1: Ten-Fold public shell

**Files:**

- Modify: `apps/space/app/root.tsx`, `apps/space/app/providers.tsx`, `apps/space/components/common/logo-spinner.tsx`, `apps/space/styles/globals.css`
- Create: `apps/space/app/assets/branding/tenfold-logo-square-rebrand-loader-v3.png`

**Interfaces:** Produces a fixed-light `AppProviders` and `LogoSpinner` that renders Ten-Fold branding with `Please wait...`.

- [ ] **Step 1: Add the existing catalog test tools.** Add `tsx` and `vitest` as `catalog:` dev dependencies in `apps/space/package.json`; run `pnpm install --filter @plane/space`.
- [ ] **Step 2: Add a behavioral loader test.** Create `apps/space/components/common/logo-spinner.test.tsx`, render `LogoSpinner` to static markup, and assert its accessible image name is `Ten-Fold` and visible copy is `Please wait...`.
- [ ] **Step 3: Verify RED.** Run `pnpm --filter @plane/space exec vitest run components/common/logo-spinner.test.tsx`; it must fail because the current loader lacks the required accessible name and text.
- [ ] **Step 3: Implement minimally.** Set `forcedTheme="light"`; replace Plane Publish public metadata with Ten-Fold copy; copy the existing Ten-Fold loader image into space assets; render it plus shimmer text from `LogoSpinner`; add the established shimmer keyframes/class locally.
- [ ] **Step 5: Verify GREEN.** Run `pnpm --filter @plane/space exec vitest run components/common/logo-spinner.test.tsx`; expect exit 0.
- [ ] **Step 6: Commit.** Stage only the task files and commit `feat: brand published views as Ten-Fold`.

### Task 2: Public header and layout controls

**Files:**

- Modify: `apps/space/app/issues/[anchor]/layout.tsx`, `apps/space/components/issues/navbar/root.tsx`, `apps/space/components/issues/navbar/controls.tsx`, `apps/space/components/issues/navbar/layout-icon.tsx`, `packages/constants/src/issue/layout.ts`

**Interfaces:** Consumes `publishSettings.workspace_detail.name`, `publishSettings.project_details.name`, and `view_props.calendar`; produces `Workspace > Project`, no public badge/theme control, and a Calendar selector when enabled.

- [ ] **Step 1: Write the failing header behavior test.** Create a test which renders `IssuesNavbarRoot` with workspace `Brunei4AI` and project `Programmes`, then asserts those labels and `>` are visible and no project-logo element exists.
- [ ] **Step 2: Verify RED.** Run the focused Vitest file; it must fail because the header currently renders only the project name and its logo.
- [ ] **Step 3: Implement minimally.** Render workspace name, `>`, then project name; remove public badge and theme control; add Calendar to the sites layouts constant and render its existing Propel icon.
- [ ] **Step 4: Verify GREEN.** Run the focused Vitest file; expect exit 0. Use Playwright against a local published URL to confirm the badge and theme button are absent and Calendar appears only for calendar-enabled settings.
- [ ] **Step 5: Commit.** Stage only the task files and commit `feat: simplify published view header and controls`.

### Task 3: Read-only public Calendar

**Files:**

- Create: `apps/space/components/issues/issue-layouts/calendar/root.tsx`
- Modify: `apps/space/components/issues/issue-layouts/root.tsx`

**Interfaces:** Consumes `anchor: string`, public issues from `useIssue()`, and each issue's `target_date`, `name`, and `sequence_id`; produces `PublicCalendarLayout({ anchor }: { anchor: string })`, a read-only month grid which opens issues through `?peekId=<id>`.

- [ ] **Step 1: Write the failing Calendar helper test.** Create `calendar/utils.ts` and `calendar/utils.test.ts`; use literal dated and undated issue fixtures to assert the helper returns a date-keyed issue map and excludes undated issues.
- [ ] **Step 2: Verify RED.** Run the focused Vitest file; it must fail because no helper exists.
- [ ] **Step 3: Implement minimally.** Use date-fns to render the current month; request public issues grouped by `target_date` for that range; show issue key/name on each matching date, an empty-state message for no dated issues, and no editing or drag-and-drop. Add the root calendar branch.
- [ ] **Step 4: Verify GREEN.** Run the focused Vitest file; expect exit 0. Use Playwright to select Calendar and confirm the dated issue is displayed in the month grid.
- [ ] **Step 5: Verify types and format.** Run `pnpm --filter=@plane/space check:types && pnpm --filter=@plane/space check:format`; expect exit 0.
- [ ] **Step 6: Commit.** Stage only the task files and commit `feat: add calendar to published views`.
