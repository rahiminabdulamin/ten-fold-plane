# Copilot Response Grounding Design

## Goal

Prevent the Ten-Fold Assistant from contradicting successful read-tool results in its final user-facing response, beginning with month-event requests such as October 2026.

## Root Cause

`list_month_events` correctly returns canonical records and a count, but the model is free to produce prose that conflicts with those records. The current prompt only prohibits empty-result claims for `list_work_items`; the scenario evaluator checks tool selection, arguments, and terminal status, but not final response text. The live evaluator similarly records only tool calls and a model-reported status.

## Scope

This change applies response grounding to successful list results in the Copilot runtime evaluation layer. It adds a compact, deterministic contract for answer text and an October-month regression scenario. It does not alter Plane services, add middleware that rewrites model text, invoke a second model, add a dependency, or change the configured model or step limit.

## Design

The runtime policy will require the final response to derive factual list claims from the successful tool result: a non-empty list must not be described as empty; an empty list must not be described as containing records; named records and counts must not be fabricated.

`AgentTrace` gains an optional `finalResponse` string. A scenario may declare `responseFacts`: the source list tool, its returned count, its canonical record names, and whether the expected list is empty. `evaluateScenario()` will apply these facts only when the trace has a final response. This keeps existing deterministic tool-flow scenarios compatible while making response-grounding scenarios executable.

The grounding evaluator is deliberately narrow and deterministic. It folds text to case-insensitive whitespace-normalized form, detects empty-list claims, checks numeric count claims when the answer uses an event/item count, and requires every canonical record name to appear for a non-empty factual list response. It reports concise failure reasons; it does not attempt open-ended natural-language fact checking.

The October 2026 scenario supplies three canonical event names and a count of three. Its passing response lists those events; its regression response starts with “There are no events…” and must fail despite correct tool calls. This directly captures the observed defect.

The opt-in live evaluator captures text output from the Responses API after tool execution, records it as `finalResponse`, and evaluates it with the same scenario contract. It continues to use fake tools only and emits only scenario IDs, tool names, and failure reasons.

## Error Handling and Privacy

Missing final text is a failed grounding check only for scenarios that declare `responseFacts`. The evaluator never prints the model response, prompts, tool arguments, or fixture record content. Production logging remains unchanged.

## Testing

Tests first prove that a contradictory October answer fails after otherwise valid calls, and that a matching answer passes. Runtime-policy tests protect the grounding instruction. Live-evaluator tests prove text extraction reaches the shared evaluator and makes a contradictory response produce a nonzero result. Focused Copilot Vitest tests and Copilot type checking provide verification.

## Acceptance Criteria

- The October 2026 “no events” contradiction fails deterministic evaluation.
- Correct tool calls alone cannot pass a response-grounding scenario.
- A response listing the canonical October events passes.
- The runtime policy explicitly covers `list_month_events` and all successful list tools.
- Live evaluation checks final model text with fake tools and does not expose sensitive or fixture data in its report.
- No production dependency, model setting, Plane API contract, or response-rewrite layer is introduced.
