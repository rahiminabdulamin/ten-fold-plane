# Mobile Sidebar Overlay Design

## Goal

On viewports narrower than the `md` breakpoint, opening the primary project sidebar must slide it over the workspace content rather than reserve horizontal layout space. Desktop and tablet layouts at `md` and wider remain unchanged.

## User experience

- A mobile sidebar opens from the left as its own fixed layer above the project content.
- The content keeps its full available width while the sidebar is open.
- Collapsing the sidebar slides the same layer out of view.
- The existing sidebar width, content, close controls, outside-click behavior, and stacking relationship are retained.

## Architecture

`ResizableSidebar` already owns the project sidebar's width and collapsed transition. Its mobile positioning currently depends on a JavaScript platform-OS result, which can disagree with a narrow browser viewport. Make its layer positioning CSS-responsive instead: apply fixed positioning at the base (mobile) breakpoint and restore normal relative layout positioning with `md:` utilities. No state, portal, backdrop, or dependency is added.

## Constraints

- Only the viewport below Tailwind's `md` breakpoint changes.
- At `md` and wider, the sidebar remains in the existing flex layout.
- Preserve accessibility attributes and existing collapse/resize behavior.

## Testing

Add a focused source-level test that asserts mobile fixed layer utilities and their `md` restoration are present, then run it with the existing Node test runner and run the web typecheck.
