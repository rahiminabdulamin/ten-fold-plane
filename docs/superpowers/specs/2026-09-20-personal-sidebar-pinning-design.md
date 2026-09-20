# Personal Sidebar Pinning Design

## Goal

Make the default project sidebar quieter for every user: keep **Home** visible, place **Drafts**, **Your work**, and **Stickies** in the existing **More** side panel, and let each user pin or unpin those personal destinations from that panel.

## Scope and decisions

- The change applies to all current and future users in every workspace.
- Home is always visible and is not configurable.
- Drafts, Your work, and Stickies are initially unpinned for every user.
- Hidden personal destinations remain routable and available from More; pinning controls sidebar visibility only.
- Personal preferences remain per user and per workspace, using the existing `WorkspaceUserPreference` records and sidebar-preferences API.
- The existing Customize navigation dialog remains compatible. It continues to show the same three personal choices and persists through the same API.
- No new preference model, API endpoint, dependency, or role policy is introduced.

## User experience

The primary sidebar renders Home followed by whichever personal items the user has pinned, in their saved order. On a fresh account, and after rollout, the visible sequence is:

```
Home
… More
Workspace
```

Selecting More opens the established extended-sidebar panel. A new Personal section appears above the existing Workspace section and lists Drafts, Your work, and Stickies with their normal icons. Each item has the same pin/unpin affordance and drag ordering behavior as Workspace-panel items:

- **Pin** immediately adds the item to the primary sidebar and persists the preference.
- **Unpin** immediately removes the item from the primary sidebar while keeping it in More.
- Navigation from More keeps the panel open, matching current Workspace-item behavior.
- Ordering personal entries in More updates the order used when they are pinned. Home stays first regardless of this order.

The panel must list all three personal destinations, including already-pinned ones, so it provides a reliable place to unpin or rearrange them. Its Personal heading must be omitted only when all three items are unavailable; the current product exposes all three, so it will normally render.

## Architecture

`WorkspaceUserPreference` already stores `key`, `is_pinned`, and `sort_order` for the three personal keys. The GET endpoint lazily creates any missing records; its creation defaults are changed to `is_pinned=False` for these keys. A Django data migration resets existing records with keys `DRAFTS`, `YOUR_WORK`, and `STICKIES` to unpinned, giving all users the requested first-run view on rollout.

The TypeScript fallback `DEFAULT_PERSONAL_PREFERENCES` is changed so an initial client render agrees with the API default. The current personal-preferences hook already translates this common store data and exposes toggle/order mutation methods, so it needs no new persistence interface.

The extended sidebar is expanded from a Workspace-only list to two independently ordered item groups:

1. Personal items, sourced from the existing static item definitions and `usePersonalNavigationPreferences`.
2. Workspace items, sourced and permission-filtered exactly as today.

Each group uses the existing drag-and-drop/pin item presentation, parameterized by preference kind rather than duplicating a panel. Personal links retain the special Your work URL construction. Dragging is constrained within its own group; it never intermixes personal and Workspace destinations.

## Data migration and rollout

The migration updates only the three personal preference keys. It sets `is_pinned=False` without deleting records or changing `sort_order`; users retain their relative order when they later pin one or more entries. The migration is idempotent in effect and safe for records that were created before deployment. Records created after deployment receive the same unpinned default through the GET view.

This deliberate reset overrides existing user selections once, as requested. Later preference changes are never overwritten by application code or subsequent reads.

## Error handling and accessibility

Pin/unpin and ordering reuse the store's existing optimistic update and rollback behavior when the sidebar-preferences request fails. Icon controls remain buttons with accessible names/tooltips; the Personal section uses a translated heading and existing keyboard-capable button/link primitives. No hidden page is blocked at the router or authorization layer.

## Testing

- Backend view tests verify missing personal preference records are created unpinned and that the response reports each key correctly.
- Migration test verifies existing Drafts, Your work, and Stickies records are reset while non-personal preference records and sort orders are unchanged.
- Frontend tests verify default preferences hide all three personal items, pinning one renders it after Home, and unpinning removes it.
- Extended-sidebar tests verify the Personal section shows all three items, pin actions call the personal preference mutation, and cross-group drag/drop is rejected.
- A focused typecheck/lint and the relevant frontend/API test commands validate the change.

## Non-goals

- Changing feature availability, authorization, direct URLs, or content on the Drafts, Your work, and Stickies pages.
- Making Home hideable or reordering it.
- Creating a new navigation-settings screen or a second preference API.
- Altering the existing Workspace item pinning behavior.
