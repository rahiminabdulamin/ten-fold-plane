# CopilotKit UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CopilotKit a compact native left-side application panel and remove the mobile authentication promotion.

**Architecture:** `PlaneCopilot` supplies CopilotKit's supported left-side and header props. `WorkspaceContentWrapper` owns the desktop lower-body offset so `TopNavigationRoot` retains full width. Scoped global CSS aligns vendor typography and chrome with Plane without changing the dependency.

**Tech Stack:** React Router, React, Tailwind CSS, CopilotKit v2, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-06-copilotkit-ui-polish-design.md`

## Global Constraints

- Work in the current checkout; do not touch `.copilotkit/` or `.playwright-cli/`.
- Do not add dependencies or modify CopilotKit package files.
- Keep the assistant available only through the existing authenticated workspace layout.
- Use existing text tokens and a local inline SVG.

---

### Task 1: Guard the requested UI contract

**Files:**

- Modify: `apps/web/tests/ten-fold-rebrand.test.mjs`

**Interfaces:**

- Consumes: application source files as build-time UI contract fixtures.
- Produces: a Node test that protects assistant branding/layout and absence of the compact-auth promotion.

- [ ] **Step 1: Write the failing test**

Add a test that reads `core/components/copilot/root.tsx`, `core/components/workspace/content-wrapper.tsx`, `styles/globals.css`, and `core/components/auth-screens/auth-base.tsx`; assert the assistant title, left placement, shell offset class, typography scope, and absence of `AuthFooter`/the promotion in `AuthBase`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: FAIL because the current assistant is right-positioned/default-titled and `AuthBase` still renders `AuthFooter`.

- [ ] **Step 3: Preserve the existing suite assertions**

Replace the obsolete assertion requiring the promo footer with the new compact-auth absence assertion; leave unrelated rebrand tests unchanged.

- [ ] **Step 4: Run the targeted test again after implementation**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 2: Make the assistant a native compact panel

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/web/core/components/workspace/content-wrapper.tsx`
- Modify: `apps/web/styles/globals.css`

**Interfaces:**

- Consumes: CopilotKit `CopilotSidebar` props `position`, `header`, `labels`, and `width`.
- Produces: a 360px left sidebar with a custom accessible header and lower-body-only desktop offset.

- [ ] **Step 1: Implement the smallest supported component configuration**

In `root.tsx`, import `CopilotModalHeader`, pass `position="left"`, `width={360}`, `labels={{ modalHeaderTitle: "Ten-Fold Assistant" }}`, and a `CopilotModalHeader` slot that renders a left-aligned inline assistant SVG, the bound title, and bound close button.

- [ ] **Step 2: Make the application shell own the lower-body offset**

Add `copilot-panel-layout` to the lower flex row in `content-wrapper.tsx`. In global CSS, add a desktop media query that offsets only this row when the document body has CopilotKit's left margin, then cancels that body margin so the top navigation remains viewport-wide.

- [ ] **Step 3: Scope vendor styling to the assistant**

Add `[data-copilotkit]` rules that inherit the application font, use primary Plane text variables, set normal body and input text to 13px, cap markdown heading sizes at 16px, and hide the CopilotKit license badge.

- [ ] **Step 4: Run the guarded UI contract**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 3: Remove the compact-auth promotion

**Files:**

- Modify: `apps/web/core/components/auth-screens/auth-base.tsx`
- Delete: `apps/web/core/components/auth-screens/footer.tsx`

**Interfaces:**

- Consumes: no external interface.
- Produces: an authentication layout without a mobile/tablet promotional footer.

- [ ] **Step 1: Remove the footer import and render**

Delete `AuthFooter` from `auth-base.tsx`; leave the logo, form, and desktop artwork unchanged.

- [ ] **Step 2: Delete the orphaned footer component**

Remove `footer.tsx`, whose only import was `AuthBase`.

- [ ] **Step 3: Run the guarded UI contract**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

### Task 4: Verify the web application

**Files:**

- Modify: none

**Interfaces:**

- Consumes: final web source.
- Produces: evidence that UI source contract, formatting, typing, and linting remain valid.

- [ ] **Step 1: Format changed files**

Run: `pnpm exec oxfmt --write apps/web/core/components/copilot/root.tsx apps/web/core/components/workspace/content-wrapper.tsx apps/web/core/components/auth-screens/auth-base.tsx apps/web/styles/globals.css apps/web/tests/ten-fold-rebrand.test.mjs docs/superpowers/specs/2026-09-06-copilotkit-ui-polish-design.md docs/superpowers/plans/2026-09-06-copilotkit-ui-polish.md`

- [ ] **Step 2: Run focused contract test**

Run: `node --test apps/web/tests/ten-fold-rebrand.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run web validation**

Run: `pnpm --filter web check:format && pnpm --filter web check:types && pnpm --filter web check:lint`

Expected: exit 0.
