# Ten-Fold Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand visible Plane surfaces as Ten-Fold, default to light mode, simplify initial setup, and hide Cycles and Modules without removing their implementation.

**Architecture:** Keep branding changes localized to existing presentation and template files. Add one web feature-visibility constant that gates UI entries and redirects protected paths; preserve services, stores, and APIs. The seed worker changes only the generated instructional project's display name.

**Tech Stack:** React Router, React/TypeScript, MobX, Django/Celery, existing pnpm tooling.

**Spec:** `docs/superpowers/specs/2026-09-05-ten-fold-rebrand-design.md`

## Global Constraints

- Do not rename `@plane/*` packages, API/database identifiers, or copyright/license notices.
- Use the supplied Ten-Fold logo PNGs from `public/`.
- Cycles and Modules remain implemented and re-enableable through a web visibility flag.
- Preserve unrelated working-tree modifications.

---

### Task 1: Establish presentation defaults and brand assets

**Files:**
- Modify: `apps/web/app/root.tsx`, `apps/web/core/store/root.store.ts`, `packages/constants/src/metadata.ts`
- Create: `apps/web/tests/ten-fold-rebrand.test.mjs`

- [ ] Write static assertions for light defaults and Ten-Fold metadata.
- [ ] Run `node --test apps/web/tests/ten-fold-rebrand.test.mjs` and confirm it fails.
- [ ] Set `ThemeProvider` and sign-out fallback to `light`; update visible metadata to Ten-Fold.
- [ ] Re-run the test and format the changed files.

### Task 2: Remove chrome and replace public-facing logos/copy

**Files:**
- Modify: authenticated header/sidebar and auth/legal logo consumers discovered by `rg`, `apps/web/app/root.tsx`, web-visible translation/copy files, `apps/api/templates/**/*.html`

- [ ] Add static assertions that GitHub/help controls are absent and Ten-Fold public logo paths are used.
- [ ] Run the test and confirm it fails.
- [ ] Remove the controls, render compact Terms/Privacy links in the sidebar, and use supplied logos in standard and narrow layouts.
- [ ] Replace user-facing Plane text in web metadata/copy and email templates; run focused tests.

### Task 3: Simplify onboarding and seed Tutorial

**Files:**
- Modify: onboarding route/wrapper, project-creation wizard/tour entrypoints, `apps/api/plane/bgtasks/workspace_seed_task.py`

- [ ] Add static assertions for the onboarding bypass and `name="Tutorial"` seed.
- [ ] Run the test and confirm it fails.
- [ ] Redirect completed authentication flows to normal workspace/home UI, suppress the tour/wizard, and set only new seeded project names to `Tutorial`.
- [ ] Run static and relevant Python tests.

### Task 4: Hide Cycles and Modules while retaining implementation

**Files:**
- Create: `apps/web/core/constants/feature-visibility.ts`
- Modify: navigation, project sidebar, settings, command-palette, work-item property, archive, and route components that expose cycles/modules.

- [ ] Add static assertions for disabled flags and route protection.
- [ ] Run the test and confirm it fails.
- [ ] Gate all discoverable entries with the visibility flag; redirect direct Cycle/Module URLs to the nearest project/work-items page.
- [ ] Run focused tests, web typecheck, and relevant lint/format checks.
