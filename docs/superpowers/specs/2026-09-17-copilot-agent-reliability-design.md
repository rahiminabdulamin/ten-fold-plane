# Copilot Agent Reliability Design

## Goal

Make the Ten-Fold Assistant reliably execute project, work-item, and spreadsheet requests without reporting unverified success, duplicating concurrent mutations, guessing missing context, or hiding partial and uncertain outcomes.

## Scope

This change strengthens the existing CopilotKit architecture. `apps/copilot` remains the model runtime, frontend tools in `apps/web` remain the authenticated executors of Plane operations, and Django remains the authority for authentication, authorization, validation, and persistence.

The implementation adds deterministic tool-boundary validation, mutation guards, reconciliation, stable outcome classification, offline scenario evaluations, and an opt-in live-model evaluation command.

It does not add an MCP server, another agent framework, a production dependency, a queue, a persistence layer, server-side idempotency, or unrelated Copilot UI changes. It does not change the configured model or step limit; evaluation evidence must justify those changes separately.

## Architecture

The request path is:

1. The user sends a request to the existing CopilotKit runtime.
2. The model selects an existing typed frontend tool.
3. The browser validates the tool arguments and trusted route context.
4. Mutation tools pass through in-flight duplicate suppression.
5. The existing Plane service performs the operation against Django.
6. The tool validates the canonical response or performs one read-after-write reconciliation when the response is ambiguous.
7. The tool returns a structured, safe outcome.
8. The assistant reports only the state established by that outcome.

Model output is untrusted. A proposed operation reaches a Plane service only after its Zod schema and contextual prerequisites pass. Prompt instructions guide tool selection but are not a correctness or security boundary.

## Tool Outcomes

Every tool result uses the existing fields `ok`, `operation`, `affectedIds`, `message`, and `retryable`, plus these stable fields:

- `status`: `success`, `partial_success`, `failure`, or `uncertain`.
- `errorCategory` when applicable: `validation`, `permission`, `not_found`, `conflict`, `rate_limit`, `network`, `timeout`, or `unexpected`.

`success` means the requested result is established by a canonical API response or reconciliation. `partial_success` means a batch has both successful and failed items. `failure` means the operation is known not to have completed. `uncertain` means the operation may have completed but the application cannot prove its final state.

Tool results expose concise safe messages and bounded structured data. They never expose raw exceptions, stack traces, cookies, tokens, or internal response bodies.

Read operations may mark transient rate-limit, network, and timeout failures as retryable. Mutation operations are never automatically retried.

## Mutation Guard

Create, update, and delete tools use a shared in-memory mutation guard. The guard computes a stable fingerprint from the operation name, trusted Team scope, canonical Workspace or artifact scope, and normalized arguments. Object keys are ordered during normalization so equivalent inputs produce the same fingerprint.

While a fingerprint is in flight, another execution with the same fingerprint returns a validation failure without calling a Plane service. The fingerprint is released when the original attempt resolves, including failure or uncertainty, so a later deliberate retry is possible.

The guard prevents concurrent duplicate submissions within the mounted browser application. It is not cross-tab, cross-browser, cross-process, or durable idempotency, and the implementation must not describe it as such.

## Contextual Validation

The existing Zod schemas remain the first validation layer. Execution boundaries also enforce these domain prerequisites:

- Operations against a named Workspace use a canonical project ID returned by lookup or trusted route context.
- State, label, member, estimate, parent, and work-item-type fields accept canonical IDs only.
- A date-range query supplies both inclusive `dateFrom` and `dateTo` boundaries, and `dateFrom` is not after `dateTo`.
- Destructive operations execute only the immutable target IDs and payload captured by their confirmation UI.
- Missing, contradictory, or ambiguous arguments return a validation failure instead of being guessed or silently dropped.

The existing bounded lookup and list sizes remain unchanged.

## Reconciliation

Mutation tools validate normal successful responses before reporting success:

- Create requires a returned canonical record ID and the expected core identity field.
- Update retrieves the canonical record and compares only fields explicitly requested by the user.
- Delete verifies that retrieving the target produces a not-found result.
- Batch create retains a result for every requested item and returns `partial_success` when only some items were created.

Reconciliation runs once only when the primary response is insufficient or ambiguous. It is not a retry of the mutation. If reconciliation cannot establish the final state, the tool returns `uncertain` with `retryable: false` and asks the user to verify before attempting the mutation again.

Spreadsheet mutations retain their existing server-issued preview token and idempotency handling. The generic browser mutation guard may prevent duplicate confirmation execution but does not replace that server contract.

## Error Classification

The tool boundary maps known service errors to stable categories using existing HTTP or service error information:

- `400` and schema failures: `validation`.
- `401` or `403`: `permission`.
- `404`: `not_found`.
- `409`: `conflict`.
- `429`: `rate_limit`.
- Recognized connection failures: `network`.
- Recognized request timeouts: `timeout`.
- All other failures: `unexpected`.

Messages remain generic enough not to leak inaccessible records or internal details. Classification must not depend on user-visible exception strings when a structured status or error code exists.

## Agent Policy

The runtime prompt remains responsible for terminology and high-level tool-selection guidance. It is reorganized into short explicit rules covering canonical Workspace resolution, schema lookup, relative dates, filtered lists, batch creation, and truthful outcome reporting.

The policy explicitly prohibits:

- Claiming success for `failure`, `partial_success`, or `uncertain` outcomes.
- Repeating a mutation automatically after an uncertain result.
- Inventing identifiers or mutation results.
- Claiming an empty result without a successful matching filtered read.

Correctness that can be enforced by a schema, guard, or reconciliation check is implemented there rather than only in prose.

## Evaluations

A shared scenario catalog defines representative user requests. Each scenario includes:

- A stable identifier and prompt.
- Expected ordered tool names.
- Critical argument subsets.
- Prohibited tool names or repeated mutations.
- The expected terminal outcome.

The first catalog covers canonical Workspace lookup, state-bucket listing, inclusive date queries, schema-backed assignment, multi-item batch creation, ambiguous Workspace lookup, partial batch failure, uncertain mutation handling, and destructive-action confirmation.

Offline evaluation is deterministic and required in CI. It validates the scenario catalog, agent policy, tool schemas, and deterministic orchestration helpers without making OpenAI calls.

Live evaluation is an explicit developer or release command. It calls the configured model with fake, bounded tools, records the selected tool sequence and arguments, and evaluates them against the same scenarios. Fake tools return fixture data and cannot access Plane services or mutate Plane data. Live evaluation is excluded from normal CI because it is paid and nondeterministic. It reports individual scenario results and exits nonzero when any required scenario fails.

No prompt content or fixture record content is emitted to production logs. Developer-invoked live evaluation may print scenario identifiers, tool names, redacted arguments, and pass/fail explanations locally.

## Observability

Tool execution logs include only correlation ID, operation name, outcome status, error category when present, duration, and affected-record count. Logs exclude prompts, arguments, record content, raw exceptions, authentication material, and cookies.

The implementation reuses the repository's existing logging facilities. It does not introduce an analytics or tracing service.

## Testing

Development follows test-driven changes. Focused tests cover:

- Stable outcome and error classification.
- Deterministic fingerprint normalization.
- Suppression and release of duplicate in-flight mutations.
- Requested-field-only update comparison.
- Create, update, and delete reconciliation outcomes.
- Exact partial batch results.
- Required context and complete date ranges.
- Runtime policy requirements.
- Offline evaluation of every catalog scenario.
- Live evaluator behavior with a stub model client; actual paid calls remain opt-in.

Verification includes the focused Copilot Vitest suite, focused web Copilot tests, web type checking, and the repository checks affected by the changed files.

## Acceptance Criteria

- A concurrent duplicate mutation invokes its Plane service no more than once.
- No create, update, or delete reports success without a canonical response or successful reconciliation.
- An ambiguous mutation response that cannot be reconciled returns `uncertain`, never `success`.
- Batch operations preserve exact per-item results and distinguish partial success.
- Tool failures expose a stable category and safe message.
- Canonical IDs and complete, ordered date boundaries are enforced before service calls.
- Offline scenarios detect incorrect tool order, missing critical arguments, repeated mutations, fabricated success, and prohibited actions.
- The live evaluator is opt-in and cannot mutate Plane data.
- Existing confirmation and Django authorization boundaries remain intact.
- No MCP service, new agent framework, new production dependency, or persistence layer is added.
