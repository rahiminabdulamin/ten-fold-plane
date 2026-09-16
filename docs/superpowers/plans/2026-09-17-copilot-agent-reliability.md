# Copilot Agent Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Ten-Fold Assistant suppress concurrent duplicate writes, report only verified mutation outcomes, expose stable safe errors, and continuously check representative agent behavior.

**Architecture:** Keep CopilotKit and the existing browser-executed Plane tools. Add small pure reliability primitives beside the existing tool contracts, apply them at mutation boundaries, and share a scenario catalog between deterministic tests and an opt-in dependency-free live evaluator.

**Tech Stack:** TypeScript, React, Zod, CopilotKit v2, Vitest, native Node.js `fetch`.

**Spec:** `docs/superpowers/specs/2026-09-17-copilot-agent-reliability-design.md`

## Global Constraints

- Work in the current checkout; do not create a worktree.
- Do not add MCP, another agent framework, a queue, persistence, server-side idempotency, or a new production dependency.
- Keep Django as the authorization and persistence authority.
- Do not change `openai:gpt-4o-mini` or `DEFAULT_AGENT_MAX_STEPS` in this implementation.
- Never automatically retry a mutation.
- Preserve existing destructive-action confirmation and spreadsheet preview-token behavior.
- Keep logs free of prompts, arguments, record content, raw exceptions, cookies, and authentication material.

---

### Task 1: Stable outcomes, error categories, and contextual validation

**Files:**

- Modify: `apps/web/core/components/copilot/tool-contracts.ts`
- Modify: `apps/web/core/components/copilot/tool-contracts.test.ts`

**Interfaces:**

- Produces: `ToolStatus`, `ToolErrorCategory`, expanded `ToolResult`, `toolPartialResult()`, `toolUncertainResult()`, `toolValidationError()`, `classifyToolError()`, and stricter `buildWorkItemQuery()`.
- Consumers: all Copilot handlers in Task 3.

- [x] **Step 1: Write failing outcome and error-classification tests**

Add tests asserting these exact behaviors:

```ts
expect(toolResult("create_work_item", "Created.")).toMatchObject({
  ok: true,
  status: "success",
  retryable: false,
});
expect(toolPartialResult("create_work_items", "Created 1 of 2.", ["issue-1"])).toMatchObject({
  ok: false,
  status: "partial_success",
});
expect(toolUncertainResult("update_work_item", ["issue-1"])).toMatchObject({
  ok: false,
  status: "uncertain",
  retryable: false,
});
expect(classifyToolError({ response: { status: 403 } })).toEqual({ category: "permission", retryable: false });
expect(classifyToolError({ response: { status: 429 } })).toEqual({ category: "rate_limit", retryable: true });
expect(classifyToolError({ code: "ECONNABORTED" })).toEqual({ category: "timeout", retryable: true });
expect(classifyToolError({ code: "ERR_NETWORK" })).toEqual({ category: "network", retryable: true });
```

Also assert that mutation-mode `toolError("create_work_item", error, { mutation: true })` always has `retryable: false`, while preserving the classified category.

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run apps/web/core/components/copilot/tool-contracts.test.ts`

Expected: FAIL because the new exports and `status` field do not exist.

- [x] **Step 3: Implement the minimal stable outcome contract**

Define:

```ts
export type ToolStatus = "success" | "partial_success" | "failure" | "uncertain";
export type ToolErrorCategory =
  | "validation"
  | "permission"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "network"
  | "timeout"
  | "unexpected";

export interface ToolResult {
  ok: boolean;
  status: ToolStatus;
  operation: string;
  affectedIds: string[];
  message: string;
  retryable: boolean;
  errorCategory?: ToolErrorCategory;
}
```

Classify structured `response.status` values `400`, `401/403`, `404`, `409`, and `429`; classify `ECONNABORTED`/`ETIMEDOUT` as timeout and `ERR_NETWORK`/`ECONNRESET` as network; use unexpected otherwise. Generate only fixed safe messages from the operation and category.

- [x] **Step 4: Write failing date-range validation tests**

```ts
expect(() => buildWorkItemQuery(undefined, "2026-09-17", undefined)).toThrow("both dateFrom and dateTo");
expect(() => buildWorkItemQuery(undefined, "2026-09-18", "2026-09-17")).toThrow("dateFrom must not be after dateTo");
```

- [x] **Step 5: Run the focused test and verify RED**

Run the command from Step 2.

Expected: FAIL because incomplete and reversed ranges are currently accepted or dropped.

- [x] **Step 6: Enforce complete ordered date ranges**

Make `buildWorkItemQuery()` throw a fixed validation error when exactly one boundary is present or when `dateFrom > dateTo`. Keep `{ per_page: "20" }` and the existing state/date query parameter names unchanged.

- [x] **Step 7: Run focused tests and commit**

Run: `pnpm exec vitest run apps/web/core/components/copilot/tool-contracts.test.ts`

Expected: PASS.

Commit:

```bash
git add apps/web/core/components/copilot/tool-contracts.ts apps/web/core/components/copilot/tool-contracts.test.ts
git commit -m "feat: classify copilot tool outcomes"
```

### Task 2: Mutation fingerprints, duplicate suppression, and reconciliation helpers

**Files:**

- Create: `apps/web/core/components/copilot/tool-reliability.ts`
- Create: `apps/web/core/components/copilot/tool-reliability.test.ts`

**Interfaces:**

- Consumes: `ToolResult`, `toolUncertainResult()`, and `classifyToolError()` from Task 1.
- Produces: `mutationFingerprint()`, `MutationGuard.run()`, `isCanonicalRecord()`, `requestedFieldsMatch()`, `confirmDeleted()`, and `logToolOutcome()`.
- Consumers: mutation handlers in Task 3.

- [x] **Step 1: Write failing fingerprint and guard tests**

Cover key-order independence, different scopes producing different fingerprints, one service invocation for two concurrent identical calls, duplicate failure status, and fingerprint release after resolve and reject:

```ts
expect(mutationFingerprint("update", "team", "project", { b: 2, a: 1 })).toBe(
  mutationFingerprint("update", "team", "project", { a: 1, b: 2 })
);

const guard = new MutationGuard();
let release!: () => void;
let calls = 0;
const first = guard.run("same", async () => {
  calls++;
  await new Promise<void>((resolve) => (release = resolve));
  return "created";
});
const duplicate = await guard.run("same", async () => "duplicate");
expect(duplicate).toMatchObject({ ok: false, status: "failure", errorCategory: "validation" });
expect(calls).toBe(1);
release();
await expect(first).resolves.toBe("created");
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run apps/web/core/components/copilot/tool-reliability.test.ts`

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement stable normalization and the in-memory guard**

Use a recursive JSON normalizer that sorts object keys and preserves array order. Implement `MutationGuard` with a private `Set<string>` and `finally` cleanup. Its duplicate result must be a `validation` failure and must never invoke the callback.

- [x] **Step 4: Write failing reconciliation-helper tests**

Assert:

```ts
expect(isCanonicalRecord({ id: "issue-1", name: "Launch" })).toBe(true);
expect(isCanonicalRecord({ id: "", name: "Launch" })).toBe(false);
expect(
  requestedFieldsMatch(
    { name: "New", priority: "high", labels: ["b", "a"] },
    {
      name: "New",
      labels: ["a", "b"],
    }
  )
).toBe(true);
```

For `confirmDeleted()`, assert that a retrieval producing classified `not_found` returns success, a returned record produces `uncertain`, and a network error produces `uncertain`.

- [x] **Step 5: Run the focused test and verify RED**

Run the command from Step 2.

Expected: FAIL because reconciliation helpers do not exist.

- [x] **Step 6: Implement minimal reconciliation helpers**

`requestedFieldsMatch()` compares only keys present in the expected object; scalar values use `Object.is`, and arrays compare after sorting copies. `confirmDeleted(operation, affectedId, retrieve)` calls `retrieve` once and returns a verified success only for a classified not-found error; all other results are uncertain.

- [x] **Step 7: Run focused tests and commit**

Before the final run, add a logging test that passes a spy callback to `logToolOutcome()`. Assert that its single structured argument contains only `correlationId`, `operation`, `status`, optional `errorCategory`, `durationMs`, and `affectedCount`; assert that neither tool arguments nor messages are accepted by the function. Implement it with `Date.now()` timing and `crypto.randomUUID()` supplied by the caller so the helper remains deterministic in tests.

Run: `pnpm exec vitest run apps/web/core/components/copilot/tool-reliability.test.ts`

Expected: PASS.

Commit:

```bash
git add apps/web/core/components/copilot/tool-reliability.ts apps/web/core/components/copilot/tool-reliability.test.ts
git commit -m "feat: guard copilot mutations"
```

### Task 3: Apply reliability controls to Plane mutation tools

**Files:**

- Modify: `apps/web/core/components/copilot/root.tsx`
- Modify: `apps/web/core/components/copilot/tool-contracts.test.ts`
- Modify: `apps/web/tests/complete-work-item-agent-schema.test.mjs`

**Interfaces:**

- Consumes: all Task 1 outcome functions and Task 2 mutation helpers.
- Produces: guarded and reconciled project/work-item mutations without changing public tool names or parameter schemas.

- [x] **Step 1: Extend source-contract tests before handler changes**

Require `root.tsx` to instantiate one module-level or component-stable `MutationGuard`, fingerprint every project/work-item create, update, batch, and delete, pass `{ mutation: true }` to mutation error conversion, call `requestedFieldsMatch()` after updates, and call `confirmDeleted()` after deletes. Require batch results to include `partial_success` when created and failed arrays are both non-empty. Require every tool handler and confirmed mutation path to call `logToolOutcome()` with the final structured result and no user arguments or result message.

- [x] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm exec vitest run apps/web/core/components/copilot/tool-contracts.test.ts
node --test apps/web/tests/complete-work-item-agent-schema.test.mjs
```

Expected: source-contract test FAIL because handlers do not use the new controls.

- [x] **Step 3: Guard create handlers and validate canonical responses**

Wrap `create_project`, `create_work_item`, and `create_work_items` in `MutationGuard.run()` using fingerprints containing operation, Team slug, canonical project scope, and normalized mutation input. Validate each returned `{ id, name }` with `isCanonicalRecord()`. Convert ambiguous create failures to `uncertain`; do not search by name and do not retry.

- [x] **Step 4: Guard and reconcile update handlers**

For `update_project`, retrieve the project after the update and compare `{ name }`. For `update_work_item`, retrieve the item after patching and compare the Plane payload keys supplied by `toWorkItemPayload(changes)`. Return success only when requested fields match; otherwise return uncertain.

- [x] **Step 5: Guard and reconcile confirmed deletes**

Keep the existing confirmation UI and captured arguments. After `deleteIssue()` or `deleteProject()`, call `confirmDeleted()` with the corresponding retrieve function. Disable each confirmation button while its guarded execution is in flight. Cancellation returns a normal `failure` result with `errorCategory: "validation"`, not an exception.

- [x] **Step 6: Return exact batch outcomes**

Keep sequential per-item attempts. Validate each created record, preserve every failed item, and return:

- `success` when all items have canonical results.
- `partial_success` when at least one succeeds and at least one fails.
- `failure` when every item fails without ambiguity.
- `uncertain` when any attempted create has an ambiguous result that cannot be verified.

Never retry an item automatically.

Log each completed tool execution through `logToolOutcome()`. Generate the correlation ID at execution start, measure elapsed milliseconds, and pass only the final outcome metadata. Use the existing console logger; do not log prompt text, arguments, messages, returned data, raw exceptions, or authentication material.

- [x] **Step 7: Run focused tests and type checking**

Run:

```bash
pnpm exec vitest run apps/web/core/components/copilot/tool-contracts.test.ts apps/web/core/components/copilot/tool-reliability.test.ts
node --test apps/web/tests/complete-work-item-agent-schema.test.mjs
pnpm --filter web check:types
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add apps/web/core/components/copilot/root.tsx apps/web/core/components/copilot/tool-contracts.test.ts apps/web/tests/complete-work-item-agent-schema.test.mjs
git commit -m "feat: verify copilot mutations"
```

### Task 4: Runtime policy and deterministic scenario evaluation

**Files:**

- Create: `apps/copilot/src/evals/scenarios.ts`
- Create: `apps/copilot/src/evals/scenarios.test.ts`
- Modify: `apps/copilot/src/runtime.ts`
- Modify: `apps/copilot/src/runtime.test.ts`

**Interfaces:**

- Produces: `AgentScenario`, `AgentTrace`, `AGENT_SCENARIOS`, and `evaluateScenario(scenario, trace)`.
- Consumers: live evaluator in Task 5.

- [x] **Step 1: Write failing runtime-policy tests**

Require the prompt to state that `partial_success`, `failure`, and `uncertain` are not success; uncertain mutations must not be automatically repeated; and tool result IDs or outcomes must never be invented. Keep existing terminology, lookup, schema, date, batch, and filtered-empty requirements.

- [x] **Step 2: Run the runtime test and verify RED**

Run: `pnpm --filter @plane/copilot test -- src/runtime.test.ts`

Expected: FAIL because the prompt lacks the explicit outcome rules.

- [x] **Step 3: Reformat and strengthen the runtime policy**

Replace the single dense string with joined short policy lines while preserving all existing requirements. Add the three outcome rules from Step 1. Do not change model or step limit.

- [x] **Step 4: Write failing scenario-evaluator tests**

Define trace assertions for ordered tool calls, critical deep-partial arguments, prohibited tools, maximum call counts, and terminal status. Include scenarios for:

- Named Workspace plus Backlog listing.
- Relative-date range listing.
- Schema-backed assignment.
- Three-item batch creation.
- Ambiguous Workspace lookup with no mutation.
- Partial batch result reporting.
- Uncertain update with no repeated mutation.
- Confirmed deletion.

For each scenario, test one passing trace and one focused failing trace.

- [x] **Step 5: Run scenario tests and verify RED**

Run: `pnpm --filter @plane/copilot test -- src/evals/scenarios.test.ts`

Expected: FAIL because the catalog and evaluator do not exist.

- [x] **Step 6: Implement the catalog and pure evaluator**

Use these types:

```ts
export interface AgentTraceCall {
  name: string;
  arguments: Record<string, unknown>;
}
export interface AgentTrace {
  calls: AgentTraceCall[];
  terminalStatus: "success" | "partial_success" | "failure" | "uncertain";
}
export interface AgentScenario {
  id: string;
  prompt: string;
  expectedCalls: Array<{ name: string; arguments?: Record<string, unknown> }>;
  prohibitedCalls?: string[];
  maxCalls?: Record<string, number>;
  terminalStatus: AgentTrace["terminalStatus"];
}
```

Return `{ pass: boolean, reasons: string[] }`. Implement recursive partial matching locally with no dependency.

- [x] **Step 7: Run focused tests and commit**

Run:

```bash
pnpm --filter @plane/copilot test -- src/runtime.test.ts src/evals/scenarios.test.ts
pnpm --filter @plane/copilot check:types
```

Expected: PASS.

Commit:

```bash
git add apps/copilot/src/runtime.ts apps/copilot/src/runtime.test.ts apps/copilot/src/evals/scenarios.ts apps/copilot/src/evals/scenarios.test.ts
git commit -m "test: add copilot reliability scenarios"
```

### Task 5: Opt-in live-model evaluator with fake tools

**Files:**

- Create: `apps/copilot/src/evals/live.ts`
- Create: `apps/copilot/src/evals/live.test.ts`
- Modify: `apps/copilot/package.json`
- Modify: `apps/copilot/README.md`

**Interfaces:**

- Consumes: `DEFAULT_AGENT_PROMPT`, `AGENT_SCENARIOS`, and `evaluateScenario()`.
- Produces: `runLiveEvaluations(fetchImpl, environment)` and the `pnpm --filter @plane/copilot eval:live` command.

- [x] **Step 1: Write failing live-runner tests**

Use a stub `fetch` implementation to assert that the runner:

- Requires `OPENAI_API_KEY` only when invoked.
- Sends the configured runtime prompt and fake tool schemas to the OpenAI Responses endpoint.
- Follows returned fake tool calls without calling Plane services.
- Redacts argument values in its report.
- Returns a nonzero result when `evaluateScenario()` fails.

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @plane/copilot test -- src/evals/live.test.ts`

Expected: FAIL because the live runner does not exist.

- [x] **Step 3: Implement the dependency-free live runner**

Use native `fetch` against `https://api.openai.com/v1/responses`, the same model identifier as `runtime.ts`, and a bounded loop of `DEFAULT_AGENT_MAX_STEPS`. Expose only fake tools named by the scenario catalog. Fake outputs use static fixture IDs and records; no imports from Plane services are allowed. Record tool names, parsed arguments, and terminal fixture status, then call `evaluateScenario()`.

When executed as the main module, print one line per scenario containing only scenario ID, tool names, pass/fail, and reasons. Exit `1` if any scenario fails and `0` otherwise.

- [x] **Step 4: Add the opt-in command and documentation**

Add:

```json
"eval:live": "tsx src/evals/live.ts"
```

Document that it is developer-facing, paid, nondeterministic, requires `OPENAI_API_KEY`, uses fake tools, cannot mutate Plane, and is intentionally excluded from normal CI.

- [x] **Step 5: Run focused tests and type checking**

Run:

```bash
pnpm --filter @plane/copilot test -- src/evals/live.test.ts src/evals/scenarios.test.ts
pnpm --filter @plane/copilot check:types
```

Expected: PASS without making a network request.

- [x] **Step 6: Commit**

```bash
git add apps/copilot/src/evals/live.ts apps/copilot/src/evals/live.test.ts apps/copilot/package.json apps/copilot/README.md
git commit -m "feat: add opt-in copilot live evals"
```

### Task 6: Final verification and documentation alignment

**Files:**

- Modify: `docs/superpowers/plans/2026-09-17-copilot-agent-reliability.md`

**Interfaces:**

- Consumes: all previous tasks.
- Produces: checked plan state and fresh verification evidence.

- [x] **Step 1: Run the complete focused verification**

```bash
pnpm --filter @plane/copilot test
pnpm --filter @plane/copilot check:types
pnpm exec vitest run apps/web/core/components/copilot/tool-contracts.test.ts apps/web/core/components/copilot/tool-reliability.test.ts
node --test apps/web/tests/complete-work-item-agent-schema.test.mjs apps/web/tests/hierarchy-nomenclature.test.mjs
pnpm --filter web check:types
pnpm --filter @plane/copilot check:format
pnpm --filter web check:format
git diff --check
```

Expected: every command exits `0` with no test failures or type errors.

- [x] **Step 2: Audit the acceptance criteria against the diff**

Confirm from code and tests that duplicate calls invoke a service once, outcomes are classified, create/update/delete success is verified, batches preserve item-level results, date ranges are complete and ordered, scenarios cover prohibited behavior, live tools are fake, and no prohibited dependency or subsystem was added.

- [x] **Step 3: Mark completed plan checkboxes and commit the plan**

```bash
git add docs/superpowers/plans/2026-09-17-copilot-agent-reliability.md
git commit -m "docs: complete copilot reliability plan"
```
