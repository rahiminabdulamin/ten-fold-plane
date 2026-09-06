# CopilotKit Agentic Integration Implementation Plan

> **For agentic workers:** Execute inline, task-by-task, with a failing test before each production-code change.

**Goal:** Add a global CopilotKit assistant backed by `gpt-4o-mini`, with safe project and work-item tools.

**Architecture:** `apps/web` remains a static SPA and calls a standalone `apps/copilot` Node runtime. The browser-side tool adapter reuses existing authenticated Plane services and stores; Plane's Django API remains the source of truth. Deletes and bulk changes use immutable human confirmation.

**Tech Stack:** React 19, React Router 8, MobX, TypeScript, Vitest, CopilotKit v2 APIs, Node HTTP.

**Spec:** `docs/superpowers/specs/2026-09-06-copilotkit-agentic-integration-design.md`

## Global Constraints

- Use stable `@copilotkit/react-core@1.69.0` and `@copilotkit/runtime@1.69.0`; onboarding's unavailable `>=1.70.0` floor is recorded as an external CLI defect.
- Keep `OPENAI_API_KEY` and `CPK_INTELLIGENCE_API_KEY` server-side and never edit protected credential files.
- Preserve `apps/web` as `ssr: false`; runtime URL is an absolute public configuration value.
- Do not add arbitrary HTTP tools, a duplicate persistence layer, A2UI, or a custom agent framework.
- Normal single-record create/update operations are direct; deletion and multi-record mutations require approval of captured canonical IDs and payload.

---

### Task 1: Runtime package and configuration

**Files:**

- Create: `apps/copilot/package.json`, `apps/copilot/tsconfig.json`, `apps/copilot/vitest.config.ts`
- Create: `apps/copilot/src/config.test.ts`, `apps/copilot/src/config.ts`
- Modify: `pnpm-workspace.yaml`, `pnpm-lock.yaml`

- [ ] Write tests proving required server credentials are validated without returning their values, origins are normalized, and defaults are bounded.
- [ ] Run `pnpm --filter @plane/copilot test` and observe the missing-module failure.
- [ ] Add the smallest typed configuration module and package manifest required for those tests.
- [ ] Re-run the focused test and TypeScript check.

### Task 2: Standalone Copilot runtime

**Files:**

- Create: `apps/copilot/src/runtime.test.ts`, `apps/copilot/src/runtime.ts`
- Create: `apps/copilot/src/server.test.ts`, `apps/copilot/src/server.ts`

- [ ] Test `openai:gpt-4o-mini`, missing-secret failure, `/healthz`, origin denial, and a same-origin-safe runtime handler.
- [ ] Observe the failing tests.
- [ ] Implement the Node listener with `BuiltInAgent`, managed Intelligence when configured, explicit allowed origins, request limits, and safe logging.
- [ ] Re-run focused runtime tests and `pnpm --filter @plane/copilot check:types`.

### Task 3: Browser tool safety primitives

**Files:**

- Create: `apps/web/core/components/copilot/contracts.test.ts`
- Create: `apps/web/core/components/copilot/contracts.ts`, `schemas.ts`, `operation-guard.ts`, `error-normalizer.ts`

- [ ] Test normalized result/error envelopes, field allowlists, immutable confirmation requests, and duplicate-operation suppression.
- [ ] Observe tests failing before creating implementation modules.
- [ ] Implement the contracts with Zod validation and no automatic retry of mutations.
- [ ] Re-run focused tests.

### Task 4: Typed Plane project and work-item tools

**Files:**

- Create: `apps/web/core/components/copilot/project-tools.ts`, `work-item-tools.ts`, `navigation-tools.ts`
- Create: `apps/web/core/components/copilot/project-tools.test.ts`, `work-item-tools.test.ts`

- [ ] Test canonical ID resolution, bounded reads, ambiguity results, one-call mutation behavior, and safe error mapping against injected existing Plane adapters.
- [ ] Observe failing tests.
- [ ] Implement narrow adapters over existing services/stores and return the contract envelope.
- [ ] Re-run focused tests and web type checking.

### Task 5: Global authenticated UI and confirmation

**Files:**

- Create: `apps/web/core/components/copilot/provider.tsx`, `sidebar.tsx`, `confirmation-card.tsx`, `use-plane-agent-context.ts`, `use-plane-tools.ts`, `index.ts`
- Modify: `apps/web/app/(all)/[workspaceSlug]/layout.tsx`, `apps/web/.env.example`, `turbo.json`, `apps/web/package.json`, `pnpm-lock.yaml`

- [ ] Test that authenticated workspace layout mounts the provider/sidebar, route context stays compact, and rejected deletion performs no mutation.
- [ ] Observe failing tests.
- [ ] Mount the v2 provider and sidebar only inside workspace routes, use the absolute runtime URL, register allowlisted tools, and render keyboard-accessible confirmation.
- [ ] Re-run focused UI tests and web type checking.

### Task 6: Operational checks and documentation

**Files:**

- Create: `apps/copilot/README.md`
- Modify: `README.md` only if needed for the two-service local command

- [ ] Document server-only secrets, local startup, allowed origins, local identity limitation, and production trusted-identity requirement.
- [ ] Run runtime tests, web tests, type checks, formatting checks, health endpoint, and CopilotKit runtime info endpoint.
- [ ] Verify a browser flow when a local Plane session is available: read/navigate, direct create/update, rejected delete, approved delete.

## Final Verification

```sh
pnpm --filter @plane/copilot test
pnpm --filter @plane/copilot check:types
pnpm --filter web check:types
pnpm check:format
curl -fsS http://127.0.0.1:8200/healthz
curl -fsS http://127.0.0.1:8200/api/copilotkit/info
```
