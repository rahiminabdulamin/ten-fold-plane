# Copilot Response Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect and prevent evaluated Copilot answers that contradict successful list-tool results.

**Architecture:** Extend the existing scenario trace with optional final-response text and attach response facts only to factual-list scenarios. Use one pure evaluator for deterministic and opt-in live evaluation; retain the current frontend tool and Plane service contracts.

**Tech Stack:** TypeScript, Vitest, native `fetch`, OpenAI Responses API.

**Spec:** `docs/superpowers/specs/2026-09-18-copilot-response-grounding-design.md`

## Global Constraints

- Work in the current checkout; do not create a worktree.
- Do not add a dependency, second model call, response-rewrite layer, or Plane API change.
- Do not change `DEFAULT_AGENT_MODEL` or `DEFAULT_AGENT_MAX_STEPS`.
- Live evaluation remains opt-in, uses fake tools only, and must not print prompts, answer text, arguments, or fixture content.

---

### Task 1: Ground final list answers in deterministic scenarios

**Files:**

- Modify: `apps/copilot/src/runtime.ts`
- Modify: `apps/copilot/src/runtime.test.ts`
- Modify: `apps/copilot/src/evals/scenarios.ts`
- Modify: `apps/copilot/src/evals/scenarios.test.ts`

**Interfaces:**

- Produces: `AgentTrace.finalResponse?: string`, `AgentResponseFacts`, and response-fact checks in `evaluateScenario()`.
- Consumes: `AgentScenario.expectedCalls` and `AgentTrace.calls` unchanged.

- [x] **Step 1: Write failing response-grounding tests**

Add an October scenario trace with correct `find_project` and `list_month_events` calls but final response `There are no events scheduled for October 2026.`. Assert `evaluateScenario(...).pass` is `false` and its reasons include an empty-list contradiction. Add a passing final response that includes `JobCentre - Career360 Session`, `IBTE Working Session - AI for Humanity`, and `(DYAP) Sekolah Arab Perempuan – Safe & Responsible Digital Citizenship Assembly`; assert it passes.

- [x] **Step 2: Verify RED**

Run: `pnpm --filter @plane/copilot test -- src/evals/scenarios.test.ts`

Expected: FAIL because traces have no final-answer contract.

- [x] **Step 3: Implement the minimal scenario contract**

Add:

```ts
export interface AgentResponseFacts {
  toolName: string;
  count: number;
  recordNames: string[];
}
```

Add `finalResponse?: string` to `AgentTrace` and `responseFacts?: AgentResponseFacts` to `AgentScenario`. In `evaluateScenario()`, for a scenario with `responseFacts`, require a non-empty final response, reject empty-list wording when `count > 0`, reject positive-list wording when `count === 0`, reject explicit numeric `event(s)` or `item(s)` counts that differ from `count`, and require each `recordNames` value in the normalized response when `count > 0`.

- [x] **Step 4: Add the policy rule and October fixture**

Add one runtime policy line requiring factual list-answer claims to come from a successful list-tool result, explicitly including `list_month_events`. Add `responseFacts` and canonical October event names to `yearless-month-selected-workspace`.

- [x] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter @plane/copilot test -- src/runtime.test.ts src/evals/scenarios.test.ts
pnpm --filter @plane/copilot check:types
```

Expected: both commands exit 0.

### Task 2: Evaluate final text in the opt-in live evaluator

**Files:**

- Modify: `apps/copilot/src/evals/live.ts`
- Modify: `apps/copilot/src/evals/live.test.ts`

**Interfaces:**

- Consumes: `AgentTrace.finalResponse` and `evaluateScenario()` from Task 1.
- Produces: live evaluation reports that fail when a final answer violates `responseFacts`.

- [x] **Step 1: Write a failing live-evaluator test**

Stub a Responses API sequence containing a correct `find_project` call, a correct `list_month_events` call, then an assistant message `There are no events scheduled for October 2026.`. Use the October scenario and assert `runLiveEvaluations()` returns `exitCode: 1` with an empty-list contradiction reason.

- [x] **Step 2: Verify RED**

Run: `pnpm --filter @plane/copilot test -- src/evals/live.test.ts`

Expected: FAIL because text output is not captured.

- [x] **Step 3: Capture response text minimally**

Extend the local Responses payload type for `output_text` or output-message text. Preserve the latest non-empty text output after fake tool calls. Pass it as `finalResponse` to `evaluateScenario()`. Do not add final text to the returned report or console output.

- [x] **Step 4: Verify GREEN and full focused suite**

Run:

```bash
pnpm --filter @plane/copilot test -- src/evals/live.test.ts
pnpm --filter @plane/copilot test
pnpm --filter @plane/copilot check:types
```

Expected: all commands exit 0.
