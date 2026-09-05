# Ten-Fold Product Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unnecessary Ten-Fold user interfaces and migrate all users to the approved defaults.

**Architecture:** Render-time UI removals leave backend data intact. A Django data migration updates existing persisted defaults while model defaults cover future records. The loader uses a web-public logo URL that survives Turborepo Docker pruning.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Django, pytest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-06-ten-fold-product-simplification-design.md`

## Global Constraints

- Keep stored profile-cover and API-token data intact.
- Set existing and new users to Light, `Asia/Singapore`, and Monday.
- Set existing and new workspace-user project navigation to `TABBED`.
- Use `/branding/tenfold-logo-long-rebrand.png` for the loader; do not add dependencies.
- Work in the current checkout and preserve unrelated staged changes.

---

### Task 1: Lock in the UI contract with regression tests

**Files:**

- Modify: `apps/web/tests/ten-fold-rebrand.test.mjs`
- Test: `apps/web/tests/ten-fold-rebrand.test.mjs`

**Interfaces:**

- Consumes: rendered source files from Tasks 2 and 3.
- Produces: regression coverage for the product-simplification contract.

- [ ] **Step 1: Write failing assertions**

Add checks that the home view does not import `TourRoot`, profile navigation excludes `developer`, profile/menu sources do not reference `CoverImage`, the loader references the long logo and `animate-shimmer`, and sidebar sources use legal routes instead of Community.

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: FAIL because the current components still contain one or more removed surfaces.

- [ ] **Step 3: Implement Tasks 2 and 3**

Make only the source changes described below.

- [ ] **Step 4: Run the regression test to verify it passes**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS with every subtest green.

### Task 2: Remove profile, quick-start, and sidebar surfaces

**Files:**

- Modify: `apps/web/core/components/home/root.tsx`
- Modify: `apps/web/core/components/settings/profile/sidebar/item-categories.tsx`
- Modify: `apps/web/core/components/settings/profile/content/pages/general/form.tsx`
- Modify: `apps/web/core/components/workspace/sidebar/user-menu-root.tsx`
- Modify: lower-sidebar component containing Community control
- Modify: `apps/web/core/components/workspace/sidebar/projects-list-item.tsx`

**Interfaces:**

- Consumes: existing profile settings categories, legal policy routes, and Propel icon exports.
- Produces: simplified settings, menu, and sidebar UI.

- [ ] **Step 1: Remove profile cover UI only**

Delete cover imports, form fields/watchers, `handleCoverImageChange` call, cover picker, and popover cover banner. Preserve avatar controls and user payload updates.

- [ ] **Step 2: Filter the profile Developer category**

Return `null` for the `developer` category before rendering category items, so the API-token link disappears with its heading.

- [ ] **Step 3: Replace sidebar controls**

Use existing Terms and Privacy routes in compact text links where Community is rendered. Replace the project disclosure emoji with the matching `ChevronRightOutline`/existing Propel icon pattern.

- [ ] **Step 4: Verify focused test**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 3: Replace loader animation and preserve product defaults

**Files:**

- Modify: `apps/web/core/components/common/logo-spinner.tsx`
- Modify: Tailwind animation source containing project utilities
- Modify: `apps/web/core/components/settings/profile/content/pages/preferences/default-list.tsx`
- Modify: `apps/web/core/components/settings/profile/content/pages/preferences/language-and-timezone-list.tsx`

**Interfaces:**

- Consumes: public `/branding/tenfold-logo-long-rebrand.png` asset and existing profile preference controls.
- Produces: non-rotating shimmer loader and Singapore/Monday UI fallback values.

- [ ] **Step 1: Update the loader**

Render the long logo at `h-[132px]` or equivalent three-times scale, remove `animate-spin`, and add a reusable non-rotating shimmer animation class.

- [ ] **Step 2: Set preference fallbacks**

Keep existing controls but use Light, `Asia/Singapore`, and Monday when profile data is absent.

- [ ] **Step 3: Verify focused test**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 4: Migrate persisted preference and navigation defaults

**Files:**

- Modify: `apps/api/plane/db/models/user.py`
- Modify: `apps/api/plane/db/models/workspace.py`
- Create: `apps/api/plane/db/migrations/0123_ten_fold_product_defaults.py`
- Create: `apps/api/plane/tests/unit/db/test_ten_fold_defaults.py`

**Interfaces:**

- Consumes: `User.user_timezone`, profile `theme` and `start_of_the_week`, and `WorkspaceUserProperties.navigation_control_preference`.
- Produces: a forward Django migration that updates existing records and defaults for new records.

- [ ] **Step 1: Write a failing migration/default test**

Create pre-existing records with UTC, non-Monday, non-Light, and Accordion values. Assert the migration/default behavior yields `Asia/Singapore`, Monday, Light, and `TABBED`.

- [ ] **Step 2: Run the focused backend test to verify it fails**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest -m unit plane/tests/unit/db/test_ten_fold_defaults.py`

Expected: FAIL before the migration/default changes.

- [ ] **Step 3: Implement defaults and migration**

Change the User timezone and WorkspaceUserProperties navigation defaults. In a reversible-safe forward migration, bulk-update existing user/profile/workspace-property preference fields to the approved values; leave reverse migration as no-op because prior user-specific choices cannot be reconstructed.

- [ ] **Step 4: Run the focused backend test to verify it passes**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest -m unit plane/tests/unit/db/test_ten_fold_defaults.py`

Expected: PASS.

### Task 5: Verify the integrated change

**Files:**

- Verify only.

- [ ] **Step 1: Run regression test**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

- [ ] **Step 2: Run web lint and types**

Run: `pnpm --filter=web run check:lint && pnpm --filter=web run check:types`

- [ ] **Step 3: Run production web build**

Run: `pnpm turbo run build --filter=web`

- [ ] **Step 4: Review staged diff and commit**

Run: `git diff --cached --check` and commit only the intended product-simplification files with `feat: simplify Ten-Fold product defaults`.
