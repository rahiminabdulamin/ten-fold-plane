# Copilot Launcher Mount Reset Design

## Goal

Place the floating Ten-Fold assistant launcher at the bottom-right whenever the browser performs a fresh whole-page mount or remount.

## Scope

`apps/web/core/components/copilot/root.tsx` owns the launcher coordinates. The existing drag interaction remains available for the lifetime of the mounted page, but persisted launcher coordinates are no longer restored during initialization.

## Behavior

- Mounting `PlaneTools` computes the existing gutter-aware bottom-right position.
- Mounting removes any previously persisted launcher-position value so a later mount cannot restore it.
- A drag still updates the live launcher position and may write the position while the page remains mounted.
- Panel-width persistence is unaffected.

## Verification

The source-contract test asserts that mount initialization clears the launcher-position storage key and assigns the default position, rather than reading persisted coordinates. Run the focused test and the web type check.
