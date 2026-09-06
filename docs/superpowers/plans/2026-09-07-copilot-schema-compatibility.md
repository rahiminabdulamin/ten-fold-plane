# Copilot Tool Schema Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the CopilotKit frontend-tool schema from containing a rejected `$ref` so ordinary messages can run.

**Architecture:** Keep the existing work-item parameter shape. Replace only the reused Zod date schema with two independent inline validators, which prevents `zod-to-json-schema` from emitting a reference for `targetDate`.

**Tech Stack:** TypeScript, Zod, CopilotKit, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-07-copilot-schema-compatibility-design.md`

## Global Constraints

- Work in the current checkout.
- Add no dependency or abstraction.
- Preserve existing date validation and tool parameter names.

---

### Task 1: Serialize independent date validators

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx:42-55`
- Test: `apps/web/tests/ui-refinements.test.mjs`

**Interfaces:**

- Produces: `startDate` and `targetDate` Zod parameter definitions that each serialize as an inline date schema.

- [ ] **Step 1: Write the failing regression assertion**

```js
assert.doesNotMatch(copilot, /const dateSchema = z\.string\(\)\.date\(\)/);
assert.match(copilot, /startDate: z\.string\(\)\.date\(\)\.nullable\(\)\.optional\(\)/);
assert.match(copilot, /targetDate: z\.string\(\)\.date\(\)\.nullable\(\)\.optional\(\)/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test apps/web/tests/ui-refinements.test.mjs`

Expected: FAIL because `dateSchema` is shared by both fields.

- [ ] **Step 3: Make the minimal production change**

```ts
startDate: z.string().date().nullable().optional(),
targetDate: z.string().date().nullable().optional(),
```

- [ ] **Step 4: Run verification**

Run: `node --test apps/web/tests/ui-refinements.test.mjs && pnpm --filter ./apps/web check:types`

Expected: both commands exit 0.
