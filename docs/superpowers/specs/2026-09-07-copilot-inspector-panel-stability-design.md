# Copilot Inspector and Panel Stability Design

## Goal

Remove the assistant panel flicker and make the Inspector metadata request an observable, correctly configured optional runtime operation.

## Root cause

`@copilotkit/core` calls `GET /api/copilotkit/inspector-metadata` after a successful runtime-info response when the runtime advertises Inspector metadata support. The route is optional. In the installed runtime, an Intelligence metadata `401` is caught and converted to a private `204 No Content`; it does not disconnect the chat runtime.

The visible panel flash is separate: `PlaneTools` observes an already-hidden or replaced uncontrolled sidebar and schedules a synthetic launcher click in `requestAnimationFrame`. The closed state is consequently painted before the click reopens it. In addition, the sidebar receives newly-created `header` and `toggleButton` objects whenever `PlaneTools` rerenders, which makes CopilotKit replace its internal sidebar view.

## Design

`PlaneTools` will keep the CopilotSidebar view inputs referentially stable. Launcher placement will be applied through CSS custom properties on the document root, rather than a changing `toggleButton.style` object. The header and launcher options will be memoized, and their event handlers will remain stable. This prevents provider and metadata updates from replacing the sidebar view.

The DOM-wide `MutationObserver`, `preserveSidebarOpen` flag, and synthetic launcher click will be removed. User close behavior, resizing, and drag persistence remain unchanged; there is no app-level reopen mechanism.

The Copilot runtime endpoint remains the source of truth for metadata: an authenticated request returns `200` with trusted metadata or `204` when unavailable. The production `CPK_INTELLIGENCE_API_KEY` must be a valid CopilotKit Intelligence credential; its invalid or revoked state is the cause of the upstream `401` and must be corrected in deployment configuration, outside the repository.

## Verification

- A runtime integration test proves a signed caller receives `204` (or `200`) from the optional metadata endpoint rather than an authorization failure.
- A web regression test verifies the implementation no longer contains synthetic launcher reopening and uses stable sidebar configuration.
- Focused web and Copilot runtime tests and type checks pass.
