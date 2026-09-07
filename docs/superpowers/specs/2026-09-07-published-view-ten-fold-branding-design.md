# Published View Ten-Fold Branding Design

## Goal

Make sharable Published project views read as Ten-Fold pages, use a fixed light appearance, and support the Calendar layout when it is enabled in the publish settings.

## Scope

- Replace Published-app Plane Publish metadata and fallback copy with Ten-Fold copy.
- Remove the floating Powered by Plane Publish link.
- Force the Published app to light theme and remove its dark-theme control.
- Render the public header as `Workspace name > Project name`, without the project emoji or icon.
- Add Calendar to the Published layout selector and render a read-only calendar backed by the existing public issue store.
- Replace Published loading states with the existing Ten-Fold shimmer logo and `Please wait...` treatment.

## Non-goals

- Do not alter publish API contracts, stored project logos, or workspace/project data.
- Do not add public editing, drag-and-drop, or additional layouts.
- Do not change unrelated web, API, or Copilot work already present in the checkout.

## Implementation

Keep changes in `apps/space` plus the existing shared layout constant. The public app already receives `workspace_detail.name`, calendar publish permission, and public issues; no API change is needed. Its Calendar component will use that data in a read-only month grid. The Ten-Fold loader asset and shimmer styling will be made available within the Published app and used by every existing `LogoSpinner` call.

## Verification

Add focused tests for branding metadata, the fixed light theme, breadcrumb output, calendar selection/rendering, and the loader. Run the affected app test/typecheck commands and formatting/lint checks that are available.
