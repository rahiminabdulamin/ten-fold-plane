# Calendar card clipping implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline in the current checkout, as requested.

**Goal:** Show every loaded desktop calendar card when date ranges and single-day stacks coexist.

**Architecture:** Retain existing rendering; size desktop weeks from the range offset plus the maximum single-day stack. Keep mobile interval lanes independent.

**Tech Stack:** TypeScript, React, Vitest, existing Node source-contract tests.

**Spec:** `docs/superpowers/specs/2026-10-07-calendar-card-clipping-design.md`

## Global constraints

No dependencies, API changes, or store changes. Preserve mobile lane allocation and existing calendar interactions. Work in the current checkout.

## Review focus

Range lanes may be deeper than the number of ranges; use the actual offset. Single-day stacks may be on different dates; reserve the largest stack, not their sum. Include ranges clipped to one visible day. Preserve empty-week minimum height. Keep mobile heights driven by their existing lanes.

## Task 1: Correct desktop week capacity

**Files:** `apps/web/core/components/issues/issue-layouts/calendar/calendar-range.ts`, `calendar-range.test.ts`, `week-days.tsx`; `apps/web/tests/mobile-calendar-agenda.test.mjs`.

**Interface:** Add `getCalendarDesktopRowCount(spans: CalendarIssueSpan[], rangeLaneCount: number): number` to the existing calendar helper. Consume it only in desktop month-week sizing.

- [x] Add tests expecting an early range plus three later cards to require four rows, two range lanes plus three cards to require five, and appropriate counts for separated dates, range-only, clipped ranges, single-only and empty weeks.
- [x] Run focused Vitest tests and observe the new capacity tests fail before implementation.
- [x] Implement the helper by counting non-range spans by visible start column, taking the maximum count and adding rangeLaneCount. Wire the returned desktop row count into week height.
- [x] Update the source contract for the new desktop sizing while retaining mobile assertions. Check any existing failing assertions against baseline before changing them.
- [x] Run calendar unit and source-contract tests, formatting, lint and web type checking; review the diff and record actual results.

## Execution record

User pre-approved design, specifications, plan and inline execution. Initial checkout has an unrelated untracked deployment log; leave it intact.

Verification: eight new capacity tests observed failing before implementation; 14 calendar unit checks and 12 source-contract checks pass. Changed-file lint, formatting and diff whitespace checks pass. Fresh independent review found no actionable issues. Browser rendering was not verified. Web type checking passes (exit 0); existing Vite/PostCSS advisory warnings remain.
