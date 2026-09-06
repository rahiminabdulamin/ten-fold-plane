# CopilotKit Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reliably resolve named projects and perform safe project/work-item operations from the global assistant.

**Architecture:** Keep all Plane reads and writes in browser-side CopilotKit frontend tools using the existing authenticated services. Extract compact, testable helpers for project matching and result/error envelopes; the Node runtime remains a stateless model broker.

**Tech Stack:** React 19, TypeScript, Zod, CopilotKit v2, Vitest, existing Plane services.

**Spec:** `docs/superpowers/specs/2026-09-06-copilotkit-production-readiness-design.md`

## Global Constraints

- Keep `OPENAI_API_KEY` and Plane session cookies out of the browser/runtime boundary.
- Do not add dependencies or an arbitrary HTTP/API tool.
- Return compact, normalized tool results only.
- Never guess an ambiguous project or perform an unconfirmed delete.
- Work in the current checkout and preserve unrelated existing changes.

---

### Task 1: Testable project resolution and tool results

**Files:**

- Create: `apps/web/core/components/copilot/tool-contracts.ts`
- Create: `apps/web/core/components/copilot/tool-contracts.test.ts`

**Produces:** `findProjectMatches`, `toolResult`, and `toolError` helpers used by frontend tools.

- [ ] **Step 1: Write failing tests** for exact case-insensitive project name/identifier matching, ambiguous matches, compact project output, and safe errors.
- [ ] **Step 2: Run** `pnpm --filter web vitest run core/components/copilot/tool-contracts.test.ts` and verify the missing helper failure.
- [ ] **Step 3: Implement** the smallest pure helpers with a 20-record cap and no service dependency.
- [ ] **Step 4: Re-run** the focused test and verify it passes.

### Task 2: Register complete safe frontend read and mutation tools

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Test: `apps/web/core/components/copilot/tool-contracts.test.ts`

**Consumes:** `findProjectMatches`, `toolResult`, `toolError`.

- [ ] **Step 1: Write failing tests** for project-name lookup and a normalized failed service response.
- [ ] **Step 2: Run** the focused test and verify it fails for missing behavior.
- [ ] **Step 3: Implement** `find_project`, project/work-item reads, safe catches, and canonical project-ID inputs; retain existing confirmation-only deletes.
- [ ] **Step 4: Re-run** the focused test and web type check.

### Task 3: Eliminate the invalid portal render path and verify the user flow

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Test: `apps/web/core/components/copilot/root.test.tsx` or the existing web test harness

**Produces:** A provider/sidebar composition that cannot attempt to use an invalid React portal container.

- [ ] **Step 1: Write a failing regression test** that mounts the assistant and asserts no React error is emitted while tools register.
- [ ] **Step 2: Run** that test and confirm it reproduces the invalid-container failure when possible.
- [ ] \*\*Step 3: Apply the smallest documented CopilotKit composition change that removes the invalid target.
- [ ] **Step 4: Run** the regression test, web type check, and the focused Copilot runtime tests.

### Task 4: Release verification

**Files:** no production files beyond Tasks 1–3.

- [ ] **Step 1: Run** `pnpm --filter @plane/copilot test`.
- [ ] **Step 2: Run** `pnpm --filter web check:types`.
- [ ] **Step 3: Run** the focused Copilot web tests.
- [ ] **Step 4: Inspect** `git diff --check` and the scoped diff, excluding unrelated existing changes.
