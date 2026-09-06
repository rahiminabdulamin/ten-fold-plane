# Complete Work-Item Agent Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the assistant to read and mutate every supported, user-editable work-item field using project-specific schema metadata.

**Architecture:** Keep frontend tools explicit and allowlisted. Add pure mapping helpers in `tool-contracts.ts`; `root.tsx` validates tool calls and obtains live project metadata through existing authenticated services. The Django `IssueSerializer` remains the authority for persistence and authorization.

**Tech Stack:** React, TypeScript, Zod, Vitest, existing Plane frontend services.

**Spec:** `docs/superpowers/specs/2026-09-06-complete-work-item-agent-schema-design.md`

## Global Constraints

- Do not add a generic API-request tool or a duplicate persistence layer.
- Support only the editable allowlist defined in the spec; never send audit, ordering, import, or rich-text storage fields.
- Use project metadata to resolve dynamic labels, states, members, estimates, and types; do not fabricate IDs.
- Preserve the existing normalized tool-result/error envelope.
- Work in the current `preview` checkout as explicitly authorized by the user.

---

### Task 1: Pure work-item payload and read-record contracts

**Files:**

- Modify: `apps/web/core/components/copilot/tool-contracts.ts`
- Test: `apps/web/core/components/copilot/tool-contracts.test.ts`

**Interfaces:**

- Produces `toWorkItemPayload(input)` for Plane API payloads and `toWorkItemRecords(issues)` with editable fields.
- Consumes human-facing fields from the tool schemas defined in Task 2.

- [x] **Step 1: Write failing tests** for a complete mutation payload, escaped multiline description, null scalar values, empty relationship arrays, and read-record field preservation.
- [x] **Step 2: Run** `pnpm --filter web test -- tool-contracts.test.ts` and confirm the requested exports/expectations fail.
- [x] **Step 3: Implement** a narrow exported mapper that converts only the documented mutation fields to Plane names and escapes description text into HTML paragraphs.
- [x] **Step 4: Run** the focused test command and confirm all assertions pass.

### Task 2: Complete typed frontend work-item tools

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Test: `apps/web/tests/complete-work-item-agent-schema.test.mjs`

**Interfaces:**

- Consumes `toWorkItemPayload` and the existing `IssueService`.
- Produces complete `create_work_item`, `update_work_item`, `get_work_item`, and `list_work_items` schemas.

- [x] **Step 1: Write a failing source-level contract test** that requires every public mutation field, mapper use for both writes, and complete read results.
- [x] **Step 2: Run** `node --test apps/web/tests/complete-work-item-agent-schema.test.mjs` and confirm it fails because the tools lack those fields.
- [x] **Step 3: Implement** Zod schemas with ISO date validation, UUID relationship IDs, optional nullable scalars, and a refined nonempty update; make both mutation handlers call the pure mapper.
- [x] **Step 4: Run** the source-level test and focused Vitest contract test; confirm both pass.

### Task 3: Project-specific schema discovery and agent guidance

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/copilot/src/runtime.ts`
- Test: `apps/web/tests/complete-work-item-agent-schema.test.mjs`
- Test: `apps/copilot/src/runtime.test.ts`

**Interfaces:**

- Produces `get_work_item_schema(projectId?)`, returning bounded states, labels, members, estimate points, and available project work-item types.
- Consumes `ProjectStateService`, `IssueLabelService`, `ProjectMemberService`, `EstimateService`, and the project response.

- [x] **Step 1: Extend the failing tests** to require schema retrieval and explicit runtime instructions to use it before name-based dynamic-field changes.
- [x] **Step 2: Run** the focused Node and Copilot runtime test commands; confirm the new expectations fail.
- [x] **Step 3: Implement** concurrent bounded metadata retrieval, a normalized schema result, and the prompt instruction. Omit unavailable work-item types rather than inventing an endpoint.
- [x] **Step 4: Run** the focused tests and `pnpm --filter web check:types`; confirm they pass.

### Task 4: Full verification

**Files:**

- Modify: the plan checkboxes as work completes.

- [x] **Step 1: Run** `pnpm --filter web test -- tool-contracts.test.ts`.
- [x] **Step 2: Run** `node --test apps/web/tests/complete-work-item-agent-schema.test.mjs`.
- [x] **Step 3: Run** `pnpm --filter @plane/copilot test` and `pnpm --filter @plane/copilot check:types`.
- [x] **Step 4: Run** `pnpm --filter web check:types`.
- [x] **Step 5: Review** `git diff --check` and the final diff for allowlist-only behavior.
