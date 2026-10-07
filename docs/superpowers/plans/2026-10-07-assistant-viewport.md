# Assistant viewport implementation plan

> Use superpowers:executing-plans inline in the current checkout.

**Goal:** Keep the floating assistant accessible after desktop viewport resizing.

**Spec:** `docs/superpowers/specs/2026-10-07-assistant-viewport-design.md`

**Approach:** Add one resize effect to `apps/web/core/components/copilot/root.tsx`, reusing the existing position clamp and state update. No new dependency or positioning abstraction.

- [x] Write `apps/web/tests/copilot-launcher-viewport.test.mjs` using the actual transpiled clamp and resize effect, with a simulated viewport and events. Verify it fails before implementation.
- [x] Add resize listener, safe null handling and unmount cleanup.
- [x] Run launcher and existing assistant UI regression checks, lint, formatting and web type checking.
- [x] Obtain an independent final review and record results.

Results: new runtime regression failed before implementation and passes now. All 23 focused checks, lint, formatting, whitespace and web type checking pass. Independent final review found no actionable issues. The broader ui-refinements suite has three failures reproduced against HEAD (recent activity spacing, identifiers and assistant header source contracts); these predate this change. Browser rendering was not verified. Changes remain uncommitted.
