# Ten-Fold Rebrand Design

## Goal

Present Ten-Fold as the product across the web application, public/authentication pages, metadata, and transactional emails, while preserving Plane's internal package and data contracts.

## Scope

- Default all sessions to the light theme, including after sign-out; keep the existing theme selector functional.
- Replace visible Plane copy and Plane logo assets with Ten-Fold copy and the supplied square or horizontal logo assets.
- Remove the GitHub-star and help affordances and replace the bottom sidebar Community affordance with compact legal links.
- Bypass the user tour and post-signup project wizard. Seed the instructional workspace project as `Tutorial`.
- Remove Cycles and Modules from visible navigation, command palette, settings, project sidebars, and route access. Do not delete models, services, stores, or API endpoints.

## Non-goals

- No rename of `@plane/*` packages, API namespaces, database tables, migrations, or copyright/license headers.
- No changes to existing users' persisted theme choice or project names.
- No deletion of Cycles/Modules functionality; a single web visibility flag must allow a future re-enable.

## Architecture

Use centralized web feature flags for visibility, guarded route redirects for direct navigation, and local conditional rendering for the existing navigation/command-palette entries. Update the existing shared metadata and template copy rather than introducing a parallel branding framework. Reuse supplied static images through the web application's public asset path.

## Verification

- Static tests assert default light theme, disabled feature flags, Ten-Fold metadata, route guards, and Tutorial seed name.
- Run the web typecheck and focused legal-page test; run the affected API unit test if its test environment is available.
