# Flexible Calendar Row Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guard against clipped desktop work-item bars and mobile dot markers in calendar month rows.

**Architecture:** Reuse the existing lane allocator in `CalendarWeekDays`. Its lane count determines the week and mobile-cell minimum heights; `CalendarChart` owns the one vertical scroll container. Add focused source-contract assertions rather than a new layout abstraction.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-26-flexible-calendar-row-height-design.md`

## Global Constraints

- Do not add dependencies, APIs, stores, or nested scroll containers.
- Preserve desktop range bars, mobile agenda selection, and calendar drag-and-drop interactions.
- Work in the current `preview` checkout; do not commit unrelated user changes.

## Review Focus

- Three or more overlapping ranges must receive matching desktop and mobile lane capacity.
- A long month must remain reachable by scrolling the calendar content container.
- Week layout must retain its existing fill-height behavior.

### Task 1: Lock flexible calendar sizing in regression coverage

**Files:**

- Modify: `apps/web/tests/mobile-calendar-agenda.test.mjs`

**Interfaces:**

- Consumes the calendar source files as source-contract inputs.
- Produces assertions for dynamic desktop week height, mobile lane height, and calendar-content scrolling.

- [ ] **Step 1: Write the failing source-contract assertions**

  Assert that the desktop week height uses `laneEnds.length`, mobile date cells use `issueRowCount`, and the calendar content uses `overflow-y-auto`.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `node --test apps/web/tests/mobile-calendar-agenda.test.mjs`
  Expected: FAIL on the stale exact class-order assertion.

- [ ] **Step 3: Replace the brittle class-order assertion with order-independent assertions and add the sizing contracts**

  Keep the test scoped to the existing calendar source; do not add production abstractions.

- [ ] **Step 4: Run focused verification**

  Run: `node --test apps/web/tests/mobile-calendar-agenda.test.mjs && git diff --check`
  Expected: PASS with zero whitespace errors.
