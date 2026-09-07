# Hierarchy Nomenclature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Team for the existing workspace entity and Workspace for the existing project entity without changing application behavior.

**Architecture:** Apply terminology only after an i18n string is resolved, so translation keys and all domain contracts remain stable. Update only visible hierarchy copy in email templates while retaining their variables and links.

**Tech Stack:** React, i18next, TypeScript, Node test runner, Django HTML email templates.

**Spec:** `docs/superpowers/specs/2026-09-07-hierarchy-nomenclature-design.md`

## Global Constraints

- `workspace` and `project` remain unchanged in identifiers, URLs, APIs, database models, and email template variables.
- Only rendered English copy changes: Workspace/Workspaces become Team/Teams; Project/Projects become Workspace/Workspaces.
- Email HTML changes are presentation-only and preserve template variables and links.

---

### Task 1: Translation display terminology

**Files:**

- Create: `packages/i18n/src/terminology.ts`
- Modify: `packages/i18n/src/hooks/use-translation.ts`
- Test: `apps/web/tests/hierarchy-nomenclature.test.mjs`

**Interfaces:**

- Produces: `applyHierarchyTerminology(value: string): string`, used only after `t()` resolves a display string.

- [ ] **Step 1: Write the failing test**

Add assertions that the terminology module defines the four singular/plural mappings.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test apps/web/tests/hierarchy-nomenclature.test.mjs`
Expected: FAIL because `packages/i18n/src/terminology.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `applyHierarchyTerminology` with whole-word replacements ordered plural-before-singular, and apply it to strings returned by the shared `t` wrapper.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test apps/web/tests/hierarchy-nomenclature.test.mjs`
Expected: PASS.

### Task 2: Email hierarchy copy

**Files:**

- Modify: `apps/api/templates/emails/invitations/workspace_invitation.html`
- Modify: `apps/api/templates/emails/invitations/project_invitation.html`
- Modify: `apps/api/templates/emails/notifications/project_addition.html`
- Test: `apps/web/tests/hierarchy-nomenclature.test.mjs`

**Interfaces:**

- Consumes: existing Django template variables and invitation URLs unchanged.
- Produces: visible Team/Workspace nomenclature in emails.

- [ ] **Step 1: Update visible copy only**

Replace parent-entity words with Team and child-entity words with Workspace; do not edit `workspace_name`, `project_name`, or URL variables.

- [ ] **Step 2: Run focused test**

Run: `node --test apps/web/tests/hierarchy-nomenclature.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run project verification**

Run: `pnpm --filter=@plane/i18n check:types && pnpm --filter=@plane/web test`
Expected: PASS.
