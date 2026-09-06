# UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the requested Home, assistant, Work Items, auth, workspace-logo, and Your Work refinements consistent and durable.

**Architecture:** The existing CopilotKit sidebar remains the chat implementation, with a small wrapper layer providing native pointer resizing and launcher drag persistence. Existing shared display-filter and profile sidebar components receive the visibility/style corrections so each change follows the established UI structure.

**Tech Stack:** React, TypeScript, Tailwind CSS, CopilotKit, Headless UI, browser pointer events/localStorage.

**Spec:** `docs/superpowers/specs/2026-09-06-ui-refinements-design.md`

## Global Constraints

- Add no dependency.
- Reuse CopilotKit and Headless UI.
- Preserve widget enablement and all stored Cycle, Module, and logo data.
- Use native pointer events and localStorage for the assistant interactions.

---

## File Structure

- `apps/web/core/components/copilot/root.tsx`: assistant width, launcher, resize and persistence behavior.
- `apps/web/styles/globals.css`: lower-row-only assistant compensation and chat-composer sizing.
- `apps/web/core/components/home/home-dashboard-widgets.tsx`: fixed Home sequence.
- `packages/ui/src/dropdowns/custom-search-select.tsx`: Popper trigger reference correction.
- `apps/web/core/components/auth-screens/auth-base.tsx`: mobile auth centering.
- `apps/web/core/components/workspace/logo.tsx`, `workspace/sidebar/dropdown-item.tsx`: unframed uploaded workspace images.
- `apps/web/core/components/profile/{sidebar,profile-issues-filter}.tsx` and `app/.../profile/.../mobile-header.tsx`: hide profile cover/editor/project emoji and unavailable Cycle/Module controls.
- `apps/web/core/components/issues/issue-layouts/properties/all-properties.tsx`: suppress disabled Cycle/Module properties in Your Work rows.

### Task 1: Assistant and Home contracts

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/web/styles/globals.css`
- Modify: `apps/web/core/components/home/home-dashboard-widgets.tsx`

- [ ] Write a source-level regression assertion that the Home sequence is `recents`, `my_stickies`, `quick_links`, and that the assistant declares the resize/launcher persistence contracts.
- [ ] Run the assertion and confirm it fails against the current sort-order-driven Home and fixed-width sidebar.
- [ ] Add the minimal assistant state: a clamped width CSS variable, pointer resize handle, full-width composer styles, and a fixed launcher whose viewport-bounded position is persisted and reset when the panel closes.
- [ ] Change Home rendering to filter enabled widgets through the fixed product sequence.
- [ ] Run the assertion and formatter; confirm the contract is present and formatting succeeds.

### Task 2: Page consistency corrections

**Files:**

- Modify: `packages/ui/src/dropdowns/custom-search-select.tsx`
- Modify: `apps/web/core/components/auth-screens/auth-base.tsx`
- Modify: `apps/web/core/components/workspace/logo.tsx`
- Modify: `apps/web/core/components/workspace/sidebar/dropdown-item.tsx`
- Modify: `apps/web/core/components/profile/sidebar.tsx`
- Modify: `apps/web/core/components/profile/profile-issues-filter.tsx`
- Modify: `apps/web/app/(all)/[workspaceSlug]/(projects)/profile/[userId]/mobile-header.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/properties/all-properties.tsx`

- [ ] Write a source-level regression assertion covering direct popper trigger refs, mobile auth centering, unrounded uploaded workspace images, and disabled Your Work visual surfaces.
- [ ] Run the assertion and confirm it fails before the changes.
- [ ] Use the actual Combobox button as the popper reference, center only the mobile auth content region, remove uploaded-logo radius/border styling, and remove the profile cover/editor and project Logo renderer.
- [ ] Pass the existing global feature flags through desktop/mobile profile display controls and gate the profile issue row's Module/Cycle properties by the same flags.
- [ ] Run the assertion, formatting, and the web TypeScript check.

### Task 3: Final verification pass

**Files:**

- Inspect all modified files and `docs/superpowers/specs/2026-09-06-ui-refinements-design.md`

- [ ] Check each of the ten user requirements against concrete code locations.
- [ ] Run `pnpm --filter web check:types`, targeted formatting, and a whitespace diff check.
- [ ] Commit the implementation with `fix: refine Ten-Fold UI interactions`.
