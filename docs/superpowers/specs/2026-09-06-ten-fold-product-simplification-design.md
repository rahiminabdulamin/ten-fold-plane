# Ten-Fold Product Simplification Design

## Goal

Remove unavailable or unnecessary user-facing features, establish Ten-Fold defaults for all users, and simplify project navigation without deleting existing customer data.

## Decisions

- Quick Get Started is not rendered on workspace or project home pages for any user.
- Profile Developer and Personal Access Tokens navigation is unavailable from the profile settings UI. Existing API-token data and routes remain intact.
- Profile cover images are a UI-only removal: existing user cover fields and assets are retained, but profile settings no longer renders or edits a cover and the avatar popover no longer renders one.
- All current users are migrated to Light theme, `Asia/Singapore` timezone, and Monday (`EStartOfTheWeek.MONDAY`). New users receive the same defaults. The existing preference controls remain available for a user to intentionally change their preference later.
- All existing `WorkspaceUserProperties` records are migrated to `TABBED`; new records default to `TABBED`.
- The sidebar Community control is replaced in the same lower-sidebar location with compact Terms of Service and Privacy Policy links.
- The project list uses an existing Propel SVG chevron/disclosure icon, never an emoji.
- The route loader uses `/branding/tenfold-logo-long-rebrand.png` at three times its former visual scale with a CSS shimmer; it does not rotate.

## Architecture

Frontend-only removals are made at their render boundaries, preserving backend contracts and stored data. Defaults with persisted state use an additive Django data migration so deployed installations update existing users and workspace-user preference rows, paired with model defaults for new records. The web client uses the public branding asset URL so Docker pruning continues to retain it.

## Components

- Home/onboarding rendering: remove the quick-start/tour surface from home views.
- Profile settings and user menu: filter developer navigation and remove profile-cover components, fields, upload helpers, and payload handling.
- Preferences: use Light, Asia/Singapore, and Monday as the initial UI fallback values; preserve manual controls after migration.
- Backend migration: set all profile theme values to Light, all `User.user_timezone` values to Asia/Singapore, all profile `start_of_the_week` values to Monday, and all workspace-user navigation preferences to Tabbed.
- Sidebar: replace the Community action with low-profile legal links and replace the emoji disclosure affordance with a Propel icon.
- Loader: long logo plus a local shimmer keyframe/utility instead of the spinning square mark.

## Error Handling and Compatibility

The migration updates only active persisted rows and uses existing enum/string values. It does not delete profile covers, API tokens, theme records, or routes. Profile/settings deep links remain routable; only navigation entries are hidden. Legal links use the existing internal policy routes.

## Verification

- Regression tests assert each removed surface is absent and the long-logo shimmer loader is used.
- Backend tests exercise the migration/default values for a pre-existing user and workspace-user property.
- Run the focused tests, web lint, web type check, and web production build.
