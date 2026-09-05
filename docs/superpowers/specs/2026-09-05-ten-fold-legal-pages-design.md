# Ten-Fold legal pages

## Purpose

Replace Plane-hosted legal links with public Ten-Fold legal pages that support Google OAuth publishing and make the policies discoverable to authenticated users.

## Public routes

- `https://ten-fold.co/terms`
- `https://ten-fold.co/privacy`

Both routes are public, responsive, and use the application’s existing visual language. Each page has a clear title, effective date, readable sections, and links to the other policy.

## Content

The pages are original operational drafts for Ten-Fold, operated by **Kognitif AI Enterprise, Brunei Darussalam**. They identify `contact@kognitif.ai` as the contact address.

The privacy policy covers account, profile, workspace, content, and upload data; Google authentication data; service providers including DigitalOcean and Resend; security; retention; user choices; changes; and contact information.

The terms cover the service, accounts and workspaces, acceptable use, customer content, service availability, third-party services, termination, disclaimers, liability, changes, and contact information.

The content is not legal advice and should be reviewed by legal counsel before it is treated as final contractual text.

## Integration

- Replace the existing Plane legal URLs in the shared authentication agreement component with same-origin `/terms` and `/privacy` links.
- Add a compact Legal area to the bottom of the authenticated workspace sidebar containing links to both pages.
- Do not change authentication behaviour, workspace permissions, or API contracts.

## Validation

- Both routes are registered and render without authentication.
- Sign-in and sign-up agreement links resolve to the Ten-Fold routes.
- Logged-in users can access both policies from the sidebar.
- Type checking/build succeeds for touched web application code.
- A repository search confirms the user-facing authentication component no longer links to `plane.so/legals`.
