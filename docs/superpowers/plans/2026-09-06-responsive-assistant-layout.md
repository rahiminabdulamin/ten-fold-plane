# Responsive Assistant Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Make the assistant and navigation panels responsive, resizable, and non-destructive to app content.

**Architecture:** Extend the existing Copilot host with browser pointer events and CSS variables; keep deliberate horizontal scrollers untouched.

**Tech Stack:** React, CSS, CopilotKit v2, existing Propel icons.

**Spec:** `docs/superpowers/specs/2026-09-06-responsive-assistant-layout-design.md`

### Task 1: Assistant panel

- [ ] Add a failing unit/browser regression for right-side state and reset behavior.
- [ ] Add mounted right sidebar, resize handle, new-thread button, and draggable launcher to `core/components/copilot/root.tsx`.
- [ ] Verify web type checking and browser interaction.

### Task 2: Shared responsive layout

- [ ] Add a failing layout regression for mobile overlays and constrained command search.
- [ ] Update `styles/globals.css`, workspace wrapper, and navigation styles to use panel-width variables, `min-width:0`, and mobile overlays.
- [ ] Verify desktop and mobile screenshots.

### Task 3: Branding and release checks

- [ ] Point root favicon links at `public/branding/tenfold-logo-square-rebrand-black-v3.png`.
- [ ] Run lint, type checks, build, and formatting.
