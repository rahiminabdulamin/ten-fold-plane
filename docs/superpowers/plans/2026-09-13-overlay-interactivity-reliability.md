# Overlay Interactivity Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shared menus, submenus, searchable selectors, popovers, and date pickers position correctly and remain interactive across Plane surfaces.

**Architecture:** Repair shared overlay primitives first, preserving their public props and existing visual styling. Use the installed Headless UI, Base UI, and Popper behavior for open state, portals, collision handling, focus, and dismissal; only patch app consumers that bypass or override those primitives incorrectly.

**Tech Stack:** React 19, TypeScript, Headless UI, Base UI, Popper/react-popper, Storybook, Playwright CLI, pnpm/Turbo.

**Spec:** `docs/superpowers/specs/2026-09-13-overlay-interactivity-reliability-design.md`

## Global Constraints

- Preserve existing component APIs and styling contracts unless a reproduced defect requires a narrow adjustment.
- Add no overlay or positioning dependency.
- Do not migrate every overlay to one library.
- Do not alter product workflows, data mutations, backend behavior, or unrelated checkout changes.
- Keep fixes in shared primitives when the behavior has multiple consumers.
- Verify pointer, keyboard, focus, dismissal, collision, scroll, and constrained-viewport behavior.

---

### Task 1: Build the overlay inventory and reproduce failures

**Files:**

- Create: `docs/superpowers/audits/2026-09-13-overlay-consumer-audit.md`
- Modify: `packages/ui/src/dropdowns/custom-menu.stories.tsx` only if an isolated reproduction is unavailable in an existing story

**Interfaces:**

- Consumes: shared overlay exports and existing Storybook stories.
- Produces: a consumer-to-primitive inventory and reproducible checks for each distinct overlay family.

- [ ] Search `apps/web`, `apps/admin`, `apps/space`, `packages/ui`, and `packages/propel` for `Menu`, `CustomMenu`, `Popover`, `Combobox`, `DateDropdown`, `Calendar`, `Portal`, `usePopper`, and manual fixed/absolute floating panels; record each distinct composition and its representative surface.
- [ ] Start the relevant Storybook/app surface and open it with the Playwright wrapper after confirming `npx` exists.
- [ ] Reproduce submenu offset, blocked input, blocked selection, date-picker clipping/non-rendering, outside dismissal, Escape, scrolling, and narrow viewport behavior; record exact pass/fail observations and console errors in the audit.
- [ ] If no isolated `CustomMenu` story exists, add a story containing two menu instances, one searchable submenu, and one clickable submenu option; this is a reusable behavior harness, not a production abstraction.
- [ ] Run the isolated checks against current code and confirm the reported failures before editing production code.

### Task 2: Repair legacy `CustomMenu` submenu ownership and events

**Files:**

- Modify: `packages/ui/src/dropdowns/custom-menu.tsx`
- Modify: `packages/ui/src/dropdowns/helper.tsx` only if an existing prop type cannot express an explicit portal/content ref
- Test: `packages/ui/src/dropdowns/custom-menu.stories.tsx` and the Task 1 browser checks

**Interfaces:**

- Consumes: existing `ICustomMenuDropdownProps`, `ICustomSubMenuProps`, and `CustomMenu.*` compound API.
- Produces: the same public compound API with instance-local overlay ownership and interactive descendants.

- [ ] Use the Task 1 harness to demonstrate that typing or selection is cancelled and that a submenu can be positioned away from its own trigger.
- [ ] Remove root-level `preventDefault()` from descendant clicks; keep trigger propagation protection only where row activation requires it.
- [ ] Replace document-global submenu lookup and synthetic hover events with refs/context belonging to the current menu instance.
- [ ] Ensure parent outside-click handling recognizes both its main portalled panel and registered submenu panels.
- [ ] Keep Popper `strategy: "fixed"` for body portals and retain flip/prevent-overflow with viewport padding.
- [ ] Re-run the harness and verify text entry, item selection, focus, outside click, Escape, two-instance isolation, and trigger-relative positioning.
- [ ] Run `pnpm --filter=@plane/ui check:types`, `check:lint`, and `build`.

### Task 3: Repair Propel menu state and submenu behavior

**Files:**

- Modify: `packages/propel/src/menu/menu.tsx`
- Modify: `packages/propel/src/menu/types.ts` only if required to preserve controlled open-state callbacks
- Modify: `packages/propel/src/menu/menu.stories.tsx`

**Interfaces:**

- Consumes: Base UI Menu root, trigger, popup, submenu root, and existing `Menu.MenuItem`/`Menu.SubMenu` API.
- Produces: one Base UI-owned open state with reliable submenu selection and dismissal.

- [ ] Extend the existing nested-menu story with a text input and observable selected value, then confirm the current menu fails at least one required interaction.
- [ ] Remove duplicated local open toggling and use Base UI's `open`/`onOpenChange` contract for visual state and `onMenuClose`.
- [ ] Remove the accidental global `close()` call from `MenuItem`; use Base UI close semantics and submenu ownership.
- [ ] Give main and submenu positioners consistent collision padding and overlay layer classes without changing popup styling.
- [ ] Re-run the nested stories for click, keyboard, Escape, focus return, and viewport-edge placement.
- [ ] Run `pnpm --filter=@plane/propel check:types`, `check:lint`, and `build`.

### Task 4: Fix portalling for date and searchable app dropdowns

**Files:**

- Modify: `apps/web/core/components/dropdowns/date.tsx`
- Modify: the shared label/search dropdown implementation identified by Task 1
- Modify: `packages/ui/src/popovers/popover.tsx` if its non-portalled panel reproduces clipping
- Modify: shared ComboDropDown/portal plumbing identified by Task 1, only as required

**Interfaces:**

- Consumes: existing `DateDropdown`, label dropdown, `Popover`, and `ComboDropDown` props.
- Produces: unchanged public component APIs whose panels escape overflow clipping and remain owned by their triggers.

- [ ] Reproduce the spreadsheet date-picker and label-search failures in an overflow-constrained representative surface.
- [ ] Portal floating content to the configured overlay root or `document.body` while preserving SSR-safe mounting.
- [ ] Pair body portals with fixed Popper positioning, flip, prevent-overflow, and an 8–12px viewport boundary.
- [ ] Ensure outside click considers the portalled panel internal and that input pointer/focus events are not cancelled.
- [ ] Re-run spreadsheet, list, detail, header-filter, dialog, and narrow-viewport representatives for date selection and search/selection.
- [ ] Run `pnpm --filter=web check:types` and `check:lint`, plus `pnpm --filter=@plane/ui check:types` if shared UI changed.

### Task 5: Audit exceptional consumers and remove local regressions

**Files:**

- Modify: only consumer files named in the audit where a local portal, z-index, event handler, or positioning override still reproduces a defect
- Update: `docs/superpowers/audits/2026-09-13-overlay-consumer-audit.md`

**Interfaces:**

- Consumes: corrected shared primitives from Tasks 2–4.
- Produces: an audit mapping every composition to a corrected primitive or a verified local exception.

- [ ] Re-scan all inventory entries and mark each as shared-fixed, locally-fixed, or verified unaffected with its representative check.
- [ ] For each locally failing exception, reproduce first, make the smallest consumer-only correction, and re-run its pointer and keyboard flow.
- [ ] Verify nested overlays inside dialogs, scroll containers, sidebars, headers, tables, list rows, settings pages, and mobile layouts.
- [ ] Confirm no global selector, synthetic hover event, blanket descendant `preventDefault`, or unexplained overlay z-index remains in touched interaction paths.

### Task 6: Full regression verification

**Files:**

- Update: `docs/superpowers/audits/2026-09-13-overlay-consumer-audit.md` with final results

**Interfaces:**

- Consumes: all prior task outputs.
- Produces: verified implementation and a reviewable audit record.

- [ ] Run focused package type, lint, build, and browser checks after every touched primitive.
- [ ] Run `pnpm check:types`, `pnpm check:lint`, and `pnpm build`; distinguish pre-existing failures from changes introduced here.
- [ ] Use Playwright at desktop and narrow viewport sizes to verify trigger alignment, scrolling alignment, collision flipping, input typing, item/calendar selection, outside click, Escape, and focus return on every representative surface available locally.
- [ ] Inspect browser console output during the flows and resolve newly introduced errors or warnings.
- [ ] Review `git diff --check`, the complete diff, and `git status --short` to confirm only intended files changed.
