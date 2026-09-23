# Label Popover Interactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore input interaction for label selector popovers in create and detail contexts.

**Architecture:** Keep the existing Headless UI and Popper composition. Raise the two menu roots to the established interactive-overlay layer and enable their pointer events explicitly; no behavior, state, or dependency changes are needed.

**Tech Stack:** React, TypeScript, Headless UI, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-label-popover-interactivity-design.md`

## Global Constraints

- Modify only the two affected selector menu class lists and their focused regression test.
- Reuse the repository’s `pointer-events-auto z-[9999]` searchable-dropdown contract.
- Do not add dependencies or a new overlay abstraction.

## Review Focus

- Create-modal menu: clicking the search field must reach the input rather than an enclosing modal layer.
- Detail-property menu: clicking the search field must reach the input rather than a property overlay.
- Keyboard-triggered opening must keep its current focus behavior.
- Mobile behavior must remain unchanged because focus is deliberately conditional.
- Label selection and creation paths must remain untouched.

### Task 1: Raise Label Selector Menus Above Overlay Layers

**Files:**

- Modify: `apps/web/core/components/issues/select/base.tsx:193`
- Modify: `apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx:214`
- Create: `apps/web/core/components/issues/label-popover-interactivity.test.ts`

**Interfaces:**

- Consumes: the shared searchable-dropdown CSS contract `pointer-events-auto z-[9999]`.
- Produces: interactable `Combobox.Options` roots in both label selector contexts.

- [ ] **Step 1: Write the failing regression test**

```ts
for (const source of affectedSelectors) {
  expect(readFileSync(source, "utf8")).toContain("pointer-events-auto z-[9999]");
}
```

- [ ] **Step 2: Run the regression test and verify it fails**

Run: `pnpm exec vitest run apps/web/core/components/issues/label-popover-interactivity.test.ts`
Expected: FAIL because neither affected menu has the interactive overlay classes.

- [ ] **Step 3: Add the existing interactive-overlay classes to both `Combobox.Options` roots**

```tsx
className = "pointer-events-auto z-[9999] ...";
```

- [ ] **Step 4: Run the regression test and verify it passes**

Run: `pnpm exec vitest run apps/web/core/components/issues/label-popover-interactivity.test.ts`
Expected: PASS.

- [ ] **Step 5: Run web type checking**

Run: `pnpm --filter=web check:types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/core/components/issues/select/base.tsx apps/web/core/components/issues/issue-layouts/properties/label-dropdown.tsx apps/web/core/components/issues/label-popover-interactivity.test.ts docs/superpowers/specs/2026-09-23-label-popover-interactivity-design.md docs/superpowers/plans/2026-09-23-label-popover-interactivity.md
git commit -m "fix: restore label popover interaction"
```
