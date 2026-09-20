# Personal Sidebar Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start every user with Home as the sole personal sidebar item, while letting them pin Drafts, Your work, and Stickies from More.

**Architecture:** Keep the existing `WorkspaceUserPreference` model and sidebar-preferences API. Change API/type defaults, reset existing personal records in one data migration, and add a Personal group to the existing More panel using shared typed list/order helpers.

**Tech Stack:** Django migrations/pytest; React, TypeScript, MobX, Atlaskit pragmatic drag-and-drop, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-personal-sidebar-pinning-design.md`

## Global Constraints

- Home is always visible, first, and never configurable.
- Only `drafts`, `your_work`, and `stickies` are reset to unpinned, for every existing and future user.
- Preserve direct page URLs, permissions, preference scope, API contract, and optimistic rollback.
- Reuse the More panel, current model, hooks, and endpoint; no new dependency or API.
- Personal and Workspace item ordering are independent; cross-group dragging is forbidden.

## Review Focus

- GET creates every missing personal record unpinned.
- Migration preserves sort order and every non-personal preference.
- Pinning one personal item makes it visible after Home while others remain in More.
- Failed preference persistence rolls back the optimistic view.
- A Personal drag cannot mutate Workspace order.

---

## File Structure

- Modify `apps/api/plane/app/views/workspace/user_preference.py`: default missing personal records to unpinned.
- Create `apps/api/plane/db/migrations/0129_reset_personal_sidebar_pins.py`: reset old personal pin values.
- Modify `apps/api/plane/tests/contract/app/test_workspace_user_preference_app.py`: GET and migration behavior tests.
- Modify `packages/types/src/navigation-preferences.ts`: match client fallback to API defaults.
- Create `apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.ts`: derive Personal/Workspace groups and group-safe sort order.
- Create `apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.test.ts`: pure unit tests for defaults/order boundaries.
- Modify `apps/web/app/(all)/[workspaceSlug]/(projects)/extended-sidebar.tsx`, `apps/web/core/components/workspace/sidebar/sidebar-menu-items.tsx`, and `apps/web/core/components/workspace/sidebar/extended-sidebar-item.tsx`: render and operate Personal rows.

## Task 1: Persist Home-only defaults

**Files:**

- Create: `apps/api/plane/db/migrations/0129_reset_personal_sidebar_pins.py`
- Modify: `apps/api/plane/app/views/workspace/user_preference.py:25-63`
- Modify: `apps/api/plane/tests/contract/app/test_workspace_user_preference_app.py`

**Interfaces:**

- Consumes: `WorkspaceUserPreference.UserPreferenceKeys.{DRAFTS,YOUR_WORK,STICKIES}` and `GET /api/workspaces/<slug>/sidebar-preferences/`.
- Produces: `is_pinned: false` for newly created personal entries; `reset_personal_sidebar_pins(apps, schema_editor)`.

- [ ] **Step 1: Write the failing GET contract test**

```python
@pytest.mark.django_db
def test_get_creates_personal_preferences_unpinned(self, session_client, create_user, workspace):
    response = session_client.get(reverse("workspace-user-preference", kwargs={"slug": workspace.slug}))

    assert response.status_code == status.HTTP_200_OK
    for key in ("drafts", "your_work", "stickies"):
        assert response.data[key]["is_pinned"] is False
```

- [ ] **Step 2: Run the new test**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/contract/app/test_workspace_user_preference_app.py::TestWorkspaceUserPreferencePatch::test_get_creates_personal_preferences_unpinned -q`

Expected: FAIL because the current view creates those records pinned.

- [ ] **Step 3: Change the lazy creation default**

In `WorkspaceUserPreferenceViewSet.get`, replace the personal-key special case in `bulk_create` with:

```python
is_pinned=False,
```

Keep current sort allocation, conflict handling, and non-personal key behavior.

- [ ] **Step 4: Write the migration behavior test**

Use `importlib.import_module("plane.db.migrations.0129_reset_personal_sidebar_pins")`. Create personal rows with orders `11, 22, 33` and an Analytics row. Invoke `reset_personal_sidebar_pins(django_apps, None)`, then assert every personal row is unpinned, Analytics remains pinned, and personal orders remain `[11, 22, 33]`.

- [ ] **Step 5: Add the data migration**

Depend on `("db", "0128_disable_first_time_tours")`. Implement the forward operation exclusively through the historical model:

```python
def reset_personal_sidebar_pins(apps, schema_editor):
    WorkspaceUserPreference = apps.get_model("db", "WorkspaceUserPreference")
    WorkspaceUserPreference.objects.filter(
        key__in=["drafts", "your_work", "stickies"],
        deleted_at__isnull=True,
    ).update(is_pinned=False)
```

Pair it with a no-op reverse function in `migrations.RunPython`.

- [ ] **Step 6: Run focused backend verification**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/contract/app/test_workspace_user_preference_app.py -q`

Expected: PASS, including existing PATCH requester-isolation tests.

- [ ] **Step 7: Commit**

```bash
git add apps/api/plane/app/views/workspace/user_preference.py apps/api/plane/db/migrations/0129_reset_personal_sidebar_pins.py apps/api/plane/tests/contract/app/test_workspace_user_preference_app.py
git commit -m "feat: default personal sidebar items to unpinned"
```

## Task 2: Build typed, group-isolated More-panel data

**Files:**

- Modify: `packages/types/src/navigation-preferences.ts:31-37`
- Create: `apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.ts`
- Create: `apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.test.ts`

**Interfaces:**

- Produces: `getPersonalExtendedSidebarItems(preferences)`, `getWorkspaceExtendedSidebarItems(preferences)`, `getPinnedPersonalItems(preferences)`, and `getDropSortOrder(sourceGroup, destinationGroup, sourceIndex, destinationIndex, items)`.
- Group values are `"personal" | "workspace"`; a cross-group drop returns `undefined`.

- [ ] **Step 1: Write failing helper tests**

Use unpinned personal preferences with different orders and Workspace data with mixed pin state. Assert all three personal rows appear in More in ascending order, Workspace remains pin-first, and:

```ts
expect(getPinnedPersonalItems(defaultPreferences)).toEqual([]);
expect(getDropSortOrder("personal", "workspace", 0, 0, personalItems)).toBeUndefined();
expect(getDropSortOrder("personal", "personal", 0, 1, personalItems)).toBe(200);
```

Use adjacent sort values `100` and `300`.

- [ ] **Step 2: Run the test**

Run: `pnpm --filter web exec vitest run core/components/workspace/sidebar/extended-sidebar.helpers.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Align TypeScript fallback defaults**

Set each entry in `DEFAULT_PERSONAL_PREFERENCES.items` to `enabled: false`; do not change its existing `sort_order`.

- [ ] **Step 4: Implement the helpers**

Build Personal from:

```ts
const PERSONAL_ITEM_KEYS = ["stickies", "your-work", "drafts"] as const;
```

Map `your-work` to `your_work`, copy static navigation definitions, attach preference pin/order, and sort only by order. Keep current Workspace dynamic-item pin-first/order-second logic. Implement the existing 10,000-gap/midpoint insertion algorithm only after group equality passes. Make `getPinnedPersonalItems` the sole enabled filtering/sort function.

- [ ] **Step 5: Verify Task 2**

Run: `pnpm --filter web exec vitest run core/components/workspace/sidebar/extended-sidebar.helpers.test.ts && pnpm --filter web check:types`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/types/src/navigation-preferences.ts apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.ts apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.test.ts
git commit -m "feat: add personal sidebar More menu group"
```

## Task 3: Render Personal More rows and connect their mutations

**Files:**

- Modify: `apps/web/app/(all)/[workspaceSlug]/(projects)/extended-sidebar.tsx`
- Modify: `apps/web/core/components/workspace/sidebar/sidebar-menu-items.tsx`
- Modify: `apps/web/core/components/workspace/sidebar/extended-sidebar-item.tsx`
- Modify: `apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.test.ts`

**Interfaces:**

- Consumes: Task 2 helpers, `usePersonalNavigationPreferences()`, and `useWorkspaceNavigationPreferences()`.
- Produces: Personal rows above Workspace rows; shared row inputs `isPinned`, `onPin`, `onUnpin`, and `group`.

- [ ] **Step 1: Add the visible-single-pin test**

Add an enabled `your_work` fixture and assert:

```ts
expect(getPinnedPersonalItems(pinnedYourWork).map((item) => item.key)).toEqual(["your_work"]);
```

- [ ] **Step 2: Run the test before rendering changes**

Run: `pnpm --filter web exec vitest run core/components/workspace/sidebar/extended-sidebar.helpers.test.ts`

Expected: FAIL until the helper is exported/used.

- [ ] **Step 3: Use the shared helper in the primary sidebar**

In `sidebar-menu-items.tsx`, replace the three bespoke personal-item conditionals with `getPinnedPersonalItems(personalPreferences)`; append that result after the current Home-only static list. Home remains outside the helper.

- [ ] **Step 4: Generalize the extended row**

In `extended-sidebar-item.tsx`, remove `useWorkspaceNavigationPreferences` and add:

```ts
isPinned: boolean;
onPin: (key: string) => void;
onUnpin: (key: string) => void;
group: "personal" | "workspace";
```

Use semantic button controls for existing pin icons. Put `group` in drag data and only accept drops from the same group. Preserve permissions, Your work user-ID URL construction, active state, and More staying open after navigation.

- [ ] **Step 5: Render the two groups**

In `extended-sidebar.tsx`, derive both groups and render translated Personal above Workspace. Bind personal callbacks as:

```tsx
onPin={(key) => togglePersonalItem(key as TPersonalNavigationItemKey, true)}
onUnpin={(key) => togglePersonalItem(key as TPersonalNavigationItemKey, false)}
```

Bind Workspace callbacks to `toggleWorkspaceItem`. Each group has its own drop handler: Personal calls `updatePersonalItemOrder([{ key, sortOrder }])`; Workspace calls `updateWorkspaceItemSortOrder(key, sortOrder)`. Calculate `isLastChild` within each section.

- [ ] **Step 6: Validate**

Run: `pnpm --filter web exec vitest run core/components/workspace/sidebar/extended-sidebar.helpers.test.ts && pnpm --filter web check:types && pnpm --filter web check:lint`

Expected: PASS.

- [ ] **Step 7: Manually verify in development**

Run: `pnpm --filter web dev`

Verify Home-only first load; all three Personal destinations in More; pin/unpin immediately updates the primary sidebar; Personal reordering is isolated; Workspace behavior remains intact; direct personal URLs still work.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/'(all)'/'[workspaceSlug]'/'(projects)'/extended-sidebar.tsx apps/web/core/components/workspace/sidebar/sidebar-menu-items.tsx apps/web/core/components/workspace/sidebar/extended-sidebar-item.tsx apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.ts apps/web/core/components/workspace/sidebar/extended-sidebar.helpers.test.ts
git commit -m "feat: pin personal navigation from More"
```

## Final verification

- [ ] Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/contract/app/test_workspace_user_preference_app.py -q`

Expected: PASS.

- [ ] Run: `pnpm --filter web exec vitest run core/components/workspace/sidebar/extended-sidebar.helpers.test.ts && pnpm --filter web check:types && pnpm --filter web check:lint`

Expected: PASS.

- [ ] Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intended changes before final integration.
