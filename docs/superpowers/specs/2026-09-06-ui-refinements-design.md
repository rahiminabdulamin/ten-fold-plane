# UI Refinements Design

## Goal

Finish ten visible consistency and interaction refinements across Home, the assistant panel, Work Items, authentication, workspace images, and Your Work.

## Shared assistant layout

The viewport-wide top navigation remains outside all assistant width compensation. The existing lower application row reserves only the current assistant width through a CSS custom property, so its own side rail and content shrink while global search, command controls, and avatar retain their positions.

The assistant uses one persisted desktop width (clamped to 280–560px), adjusted by a native pointer-event drag handle. Its composer receives the entire available panel width. The launcher is a fixed, pointer-draggable control constrained to the viewport on desktop and mobile; its normalized position is stored in local storage. Closing the assistant resets that stored position to bottom-right, as does a fresh page load.

## Home and page consistency

Home renders enabled widgets in a fixed product order: Recents, Your Stickies, Quick links. Widget enablement remains server-backed; user-controlled ordering is ignored for this surface.

Workspace image logos render as unframed square images with no border radius. Mobile authentication centers the main form region while preserving the logo and overflow menu alignment. Work Items filter popovers use their actual trigger as the positioning reference.

Your Work hides project cover/emoji affordances in the details panel and removes Modules and Cycles from Assigned, Created, and Subscribed views whenever those global features are disabled, matching the rest of the application.

## Constraints

- Reuse existing CopilotKit and Headless UI components; add no dependency.
- Use browser pointer events and local storage for dragging and persistence.
- Preserve existing API data and widget enablement behavior.
- Do not remove underlying Cycle, Module, or project-logo data.

## Verification

- Add focused static/regression assertions for widget order, assistant layout/drag contracts, popover reference, and disabled feature surfaces.
- Run the focused test, formatting, and relevant TypeScript checks.
- Perform a final manual source checklist against all ten requirements.
