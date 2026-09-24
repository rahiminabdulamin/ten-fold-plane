# Issue notification email branding

## Goal

Bring the issue-update notification email in line with Ten-Fold branding so recipients see no Plane brand or links to Plane social accounts.

## Scope

- Replace the notification header image with the existing Ten-Fold white logo hosted on `ten-fold.co` and provide Ten-Fold alt text.
- Keep notification content, CTA, unsubscribe, and email-preference links unchanged.
- Remove the GitHub, LinkedIn, and X social-icon block and its Plane destinations.
- Remove decorative update icons hosted under Plane infrastructure; their adjacent text continues to convey each update.
- Add a rendering regression test that rejects Plane references and social destinations in this template.

## Non-goals

- Rebrand other email templates or internal package names.
- Add new social profiles or a replacement footer.

## Verification

Render the email with minimal notification context and assert the Ten-Fold logo is present while `Plane`, `plane.so`, `makeplane`, and `planepowers` are absent. Run that focused test and a targeted source scan.
