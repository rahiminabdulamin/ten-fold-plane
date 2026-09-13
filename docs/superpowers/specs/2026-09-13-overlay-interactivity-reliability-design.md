# Overlay Interactivity Reliability Design

## Goal

Make menus, submenus, searchable selectors, popovers, and date pickers position correctly and remain fully interactive across Plane's web, admin, and space surfaces without redesigning unrelated UI.

## Scope

The audit covers shared overlay primitives and their consumers in page headers, sidebars, work-item list and spreadsheet layouts, work-item details, filters, settings, dialogs, command surfaces, and mobile or constrained viewports. The required behaviors are:

- an overlay opens next to its trigger and remains aligned while its scroll container or viewport moves;
- nested menus can be opened, searched, keyboard-navigated, selected, and dismissed;
- pointer events inside an overlay are not cancelled by an ancestor;
- portalled overlays are treated as inside their owning menu for dismissal purposes;
- date-picker popovers render above surrounding content and are not clipped by table or layout overflow;
- outside click, Escape, item selection, focus return, disabled states, and viewport collision handling continue to work;
- no overlay relies on a document-global selector or synthetic mouse event to coordinate with another instance.

This work does not change product workflows, visual design, data mutations, or backend behavior. It does not replace all overlay libraries solely for consistency.

## Current Architecture and Failure Modes

The repository contains three relevant families: Base UI primitives in `@plane/propel`, legacy Headless UI plus Popper primitives in `@plane/ui`, and app-level dropdown compositions. They use inconsistent open-state ownership, portal targets, positioning strategies, outside-click detection, and event propagation.

The initial code audit identified concrete hazards:

- `CustomMenu` cancels every bubbled click with both `stopPropagation()` and `preventDefault()`, including clicks originating in interactive descendants.
- Legacy submenus portal their panels to `document.body` while the parent uses a subtree ref for outside-click detection.
- Submenu hover coordination uses `document.querySelector`, so multiple menus can target the wrong instance.
- Legacy menu state duplicates Headless UI's internal open state.
- Some overlay content is kept inside overflow-clipped table and layout containers.
- Stacking levels and fixed/absolute positioning strategies vary by consumer.
- The Propel menu also has duplicated open state and incomplete submenu coordination.

These explain the reported symptoms while allowing for additional defects found during the consumer audit.

## Design

### Shared behavior first

Fix shared primitives before consumers. Each primitive will have one owner for open state, use the overlay library's supported trigger/content relationship, and portal floating content when necessary to escape clipping. Positioning will use the library's collision and viewport logic rather than page-specific coordinates.

Existing public component props will be preserved wherever possible. Consumer changes are limited to cases that bypass or misconfigure the shared behavior.

### Event and focus handling

Remove blanket cancellation from menu roots. Trigger handlers may stop propagation only where opening the trigger would otherwise activate a containing row; they must not cancel descendant input, option, calendar, or button defaults. Portalled content will be recognized through explicit refs or the underlying library's ownership model, not global DOM queries.

Search inputs retain focus and accept text. Menu items keep pointer and keyboard selection. Escape closes the active nested layer first, outside click closes the owned overlay tree, and focus returns to the initiating trigger when appropriate.

### Positioning and layers

Floating panels use a viewport-aware fixed strategy when portalled to the document body and the library's native positioner where Base UI already provides one. Flip, shift/prevent-overflow, and a small viewport padding apply consistently. Overlay positioners receive the shared overlay stacking layer; individual consumers should not need arbitrary z-index overrides.

The implementation will not add a new positioning dependency. It will use the already-installed Base UI and Popper capabilities.

### Consumer audit

Search all apps and shared packages for menu, popover, combobox, tooltip-like selector, and calendar compositions. Group consumers by shared primitive, then verify at least one representative from every distinct composition and inspect exceptions individually. Special attention goes to scrollable list/spreadsheet cells, nested quick-action menus, header filters, sidebars, dialogs, settings, and mobile layouts.

## Verification

Regression tests will be added at the lowest layer able to reproduce each defect. They will cover:

- submenu placement relative to its trigger;
- clicking submenu items;
- typing into submenu search inputs;
- nested outside-click and Escape behavior;
- date-picker visibility from an overflow-constrained cell;
- viewport collision/flip behavior where supported by the existing test environment;
- multiple simultaneous menu instances without cross-instance coordination.

Tests must fail against the existing behavior before production changes are made. After focused tests pass, run package-level type, lint, and test checks, then the relevant broader checks. Finally, use a real browser to exercise representative surfaces at desktop and narrow viewport sizes, checking console errors as well as visible behavior.

## Regression Controls

- Preserve existing component APIs and styling contracts unless a defect requires a narrowly documented adjustment.
- Avoid a wholesale migration between overlay libraries.
- Do not alter unrelated user changes in the checkout.
- Keep fixes inside shared primitives when the same behavior has multiple consumers.
- Treat each exceptional consumer override as suspect and retain it only when a reproducible layout requires it.
- Stop and reassess if a proposed fix changes selection, dismissal, or focus semantics outside this specification.
