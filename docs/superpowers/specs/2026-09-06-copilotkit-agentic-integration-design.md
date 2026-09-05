# CopilotKit Agentic Integration Design

## Objective

Add a global AI assistant to Plane's web application using CopilotKit and OpenAI `gpt-4o-mini`. The first release supports project and work-item search, summaries, navigation, and CRUD. Tool-driven mutations must be reliable, authorized, observable, and safe against accidental destructive changes.

## Scope

### Included

- A global assistant sidebar in `apps/web` on authenticated application routes.
- Compact workspace, project, work-item, and current-view context derived from the active route.
- Typed tools for project and work-item list/search/get/create/update/delete operations.
- Navigation to projects and work items.
- Summaries based on bounded results returned by existing Plane APIs.
- Explicit confirmation before deletes and bulk mutations.
- A standalone CopilotKit runtime using `gpt-4o-mini` and a server-side `OPENAI_API_KEY`.
- Focused unit, contract, runtime, UI, and browser-flow tests.

### Excluded from the first release

- Tools for cycles, modules, pages, comments, intake, or other Plane artifacts.
- A vector database, embeddings pipeline, retrieval index, or duplicate persistence layer.
- A custom agent framework or generic tool that can call arbitrary Plane API endpoints.
- Changes to Plane's Django authorization or transaction model.
- Conversation persistence beyond what the selected CopilotKit runtime configuration provides by default.

## Architecture Decision

Plane's `apps/web` is an intentionally static React Router SPA (`ssr: false`) and cannot safely host `OPENAI_API_KEY` or a server-side CopilotKit handler. Add a small standalone Node service, `apps/copilot`, that exposes the CopilotKit v2 runtime. The static web client connects to this runtime through a configured absolute URL.

The runtime brokers model traffic only. Typed frontend tools in `apps/web` adapt CopilotKit calls to Plane's existing services and MobX stores. All reads and writes continue through the Django API, which remains the sole authority for authentication, object-level authorization, validation, transactions, and persistence.

This design avoids converting the SPA to a server-rendered deployment and avoids coupling AI traffic to `apps/live`, whose responsibility is real-time collaborative editing.

## Components

### Copilot runtime service

`apps/copilot` will:

- Use CopilotKit's current v2 runtime API.
- Configure a built-in agent with `openai/gpt-4o-mini` (or the exact equivalent required by the installed CopilotKit release).
- Read `OPENAI_API_KEY` from its server environment and fail startup clearly if it is absent.
- Expose CopilotKit runtime endpoints and a health endpoint.
- Restrict browser origins to configured Plane web origins.
- Apply bounded request bodies, rate limits, timeouts, and sanitized error handling.
- Log correlation ID, operation category, duration, and outcome without logging prompts, artifact content, cookies, or secrets by default.

It will not hold Plane session cookies or call Plane's CRUD API. That keeps the service stateless with respect to Plane data and prevents user credentials from being sent to the model runtime.

### Web integration

The authenticated `apps/web` application shell will:

- Mount the CopilotKit provider and global sidebar.
- Configure the runtime URL from a public deployment-time environment variable.
- Register compact route context, including current workspace, project, work item, and view identifiers when available.
- Avoid copying large MobX stores or sensitive user data into model context.
- Hide or disable the assistant outside authenticated product routes.

### Tool adapter

A focused adapter in `apps/web` will register explicit, Zod-validated frontend tools. Tools will reuse existing Plane services and stores rather than introduce a second client or generic request executor.

Initial tools cover:

- Projects: list/search, get, create, update, and delete.
- Work items: list/search, get, create, update, and delete.
- Navigation: open a canonical project or work-item route.
- Summaries: supply bounded structured records for the model to summarize.

Each mutation tool accepts only an allowlisted subset of fields. Workspace and project scope come from trusted application context when available. Human-friendly names or identifiers are resolved to canonical IDs before mutation. Ambiguous matches return choices rather than guessing.

There will be no arbitrary HTTP, URL, method, or request-body tool.

### Confirmation UI

Deletes and bulk mutations use CopilotKit v2 human-in-the-loop support. The confirmation card shows the operation, canonical targets, and intended changes. Approval binds to an immutable snapshot of those target IDs and payload; the model does not reconstruct the mutation after approval.

Ordinary creates and single-record updates execute without an extra confirmation step after schema validation. Django still performs final authorization and validation.

## Data Flow

1. The user sends a message through the global assistant sidebar.
2. The web client sends the message and compact route context to `apps/copilot`.
3. `gpt-4o-mini` selects from the explicitly registered tool schemas.
4. Read tools call existing Plane services and return bounded structured data.
5. Mutation tools resolve canonical targets and validate allowlisted payload fields.
6. A delete or bulk mutation pauses on an inline confirmation card. Rejection ends the operation; approval executes the captured payload.
7. The adapter calls the existing Plane service/store exactly once for the declared mutation.
8. The relevant MobX state is updated or refetched and reconciled with the API response.
9. The tool returns a normalized result, and the assistant reports the outcome or navigates through the existing router.

## Tool Contract and Reliability

Every tool returns a consistent structured envelope containing:

- `ok`: whether the operation succeeded.
- `operation`: the stable tool operation name.
- `affectedIds`: canonical identifiers touched by the operation.
- `message`: a concise, safe user-facing result.
- `retryable`: whether retrying may be appropriate.
- Optional canonical URLs or bounded result data.

Raw Axios responses, stack traces, cookies, and internal error details are never returned to the model.

Reliability controls include:

- Strict Zod schemas and mutation field allowlists.
- Bounded search and list result sizes.
- Canonical ID resolution with explicit ambiguity handling.
- Client-generated operation IDs and suppression of duplicate in-flight submissions.
- Mutation timeouts and reconciliation before reporting success.
- No automatic retries for non-idempotent writes.
- Exactly one API mutation for one approved tool execution.
- Stable error categories for validation, permission, conflict, not-found, rate-limit, network, timeout, and unexpected failures.

The client operation ID is a frontend duplicate guard, not a replacement for server-side idempotency. If testing shows that retries can cross process or browser boundaries, a Django-supported idempotency key can be proposed as a later, separately scoped enhancement.

## Security and Authorization

- `OPENAI_API_KEY` exists only in the standalone runtime's server environment.
- Plane session cookies remain between the browser and Django and are not forwarded to OpenAI or stored by `apps/copilot`.
- The Copilot runtime permits only configured production and development web origins.
- Copilot UI and tools are mounted only within authenticated product routes.
- Trusted route/application context constrains workspace and project scope where possible.
- Client-side permission checks are UX aids only; Django remains the final authorization boundary.
- Deletes and bulk changes cannot execute without an explicit affirmative response to the exact captured operation.
- Logs exclude secrets, cookies, prompts, and artifact content by default.

Prompt instructions do not constitute a security boundary. Safety is enforced by tool availability, schemas, scope binding, confirmation logic, and Django authorization.

## Error Handling

Tool errors are normalized into safe, actionable results:

- Validation errors identify invalid user-editable fields.
- Permission errors state that the current user cannot perform the action.
- Not-found errors identify stale or unavailable targets without leaking inaccessible objects.
- Conflict errors ask the user to refresh or reconsider changed data.
- Rate-limit, network, and timeout errors are marked retryable only when retrying is safe.
- Unexpected failures receive a correlation ID for diagnostics and expose no internal details.

Rejected confirmations are normal completed outcomes, not errors. If a mutation response is uncertain, the adapter reconciles the target with the server before claiming success.

## Testing Strategy

### Unit tests

- Tool input schemas and mutation field allowlists.
- Route-context scoping and canonical ID resolution.
- Ambiguous-reference handling.
- Normalized result and error envelopes.
- Duplicate in-flight mutation suppression.
- Confirmation approval and rejection behavior.
- Log sanitization helpers.

### Contract tests

Mock existing Plane stores and services and verify:

- One tool invocation produces the expected service call.
- One approved mutation produces exactly one API mutation.
- Rejected destructive operations produce no mutation.
- Successful writes trigger the correct store update or refetch.
- Permission, validation, conflict, and uncertain-response cases are mapped correctly.

### Runtime tests

- The agent is configured for `gpt-4o-mini`.
- Startup fails safely when `OPENAI_API_KEY` is absent.
- Origin restrictions, request limits, health checks, and sanitized errors behave correctly.

### UI and browser-flow tests

- The sidebar is globally available on authenticated routes and absent elsewhere.
- Route changes update compact agent context.
- Confirmation cards are keyboard accessible and correctly approve or reject.
- Loading, success, and error states render correctly.
- Representative prompts can find a project, summarize work items, navigate to a record, create and update a work item, reject a deletion, approve a deletion, and recover from a denied mutation.

Existing `apps/web` checks and the focused `apps/copilot` Vitest suite must pass.

## Acceptance Criteria

- The global assistant uses CopilotKit v2 and OpenAI `gpt-4o-mini`.
- `OPENAI_API_KEY` is never included in a client bundle or browser response.
- The assistant can search, summarize, and navigate projects and work items.
- It can create, update, and delete projects and work items through existing Plane APIs.
- Typed schemas and trusted context prevent arbitrary endpoint calls and unintended cross-workspace mutation.
- Deletes and bulk changes always require approval of the exact targets and payload.
- A rejected confirmation performs no mutation.
- One approved tool call performs no more than one declared API mutation.
- Success is reported only after API/store reconciliation.
- Authorization failures and other expected errors are safe and actionable.
- Targeted tests and existing project checks pass.

## Implementation Boundary

On implementation approval, run the requested onboarding command from the actual Git root using the coding-agent slug `codex`:

```sh
npx --yes copilotkit@latest onboard start --run fd3bde140e38 --coding-agent codex
```

Follow the command's Markdown instructions, reconciling generated guidance with this approved architecture. Do not accept onboarding changes that expose secrets in `apps/web`, convert the static SPA deployment without explicit approval, bypass existing Plane services, or weaken the mutation controls defined here.
