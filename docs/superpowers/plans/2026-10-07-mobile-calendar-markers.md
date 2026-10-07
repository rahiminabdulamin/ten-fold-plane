# Mobile calendar marker implementation plan

> **For agentic workers:** Use superpowers:executing-plans to execute inline in the current checkout, as requested.

**Goal:** Show single dots for isolated items and thinner connectors for ranges.

**Architecture:** Keep transparent 16px lanes; conditionally render a centered 4px connector and existing 12px endpoint dots.

**Tech Stack:** React, Tailwind CSS, existing Node source-contract tests and Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-mobile-calendar-markers-design.md`

## Global constraints

No dependencies or changes to data, interaction, desktop cards, or marker lane allocation. Work in the current checkout.

## Review focus

Check isolated items have no duplicate endpoint dot; connectors are centered against endpoints; middle segments remain continuous; week-boundary continuation and hidden-weekend behavior retain existing semantics; dense date stacks retain their heights.

## Task 1: Refine mobile marker markup

**Files:** Modify `apps/web/core/components/issues/issue-layouts/calendar/day-tile.tsx` and `apps/web/tests/mobile-calendar-agenda.test.mjs`.

**Interfaces:** Existing previous/next adjacency booleans decide whether a connector or isolated dot is rendered. Keep all public component props.

- [x] Add source-contract assertions for a transparent 16px wrapper, connector gated on either adjacency boolean with `h-1` and vertical centering, and a single `size-3` isolated dot with no endpoint duplication.
- [x] Run the Node test file and observe the new tests fail for the existing thick wrapper/stub.
- [x] Remove the wrapper background; add the conditional connector and isolated dot; gate the existing start endpoint on next-date adjacency. Preserve horizontal extents and vertical positioning.
- [x] Run Node calendar checks, focused Vitest calendar checks, changed-file lint/format, web type checking, and whitespace validation.
- [x] Obtain a fresh final review and record validation results.

## Execution record

User pre-approved design, specification, plan and inline execution in the current checkout. No approval handoff is pending.

Verification: new source-contract tests failed before implementation and now pass. All 14 mobile Node checks and 14 calendar Vitest checks pass. Changed-file lint and formatting and diff whitespace checks pass. Fresh independent review found no actionable issues. Browser appearance was not verified. Web type checking passes (exit 0), with existing Vite/PostCSS advisory warnings.
