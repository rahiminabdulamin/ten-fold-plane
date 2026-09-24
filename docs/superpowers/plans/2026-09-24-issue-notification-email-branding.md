# Issue notification email branding implementation plan

## Files

- `apps/api/plane/tests/unit/bg_tasks/test_issue_updates_email_branding.py`: rendered-template regression test.
- `apps/api/templates/emails/notifications/issue-updates.html`: Ten-Fold header and footer without social controls.

## Task 1: Protect the rendered email

1. Add a unit test that renders `emails/notifications/issue-updates.html` with minimal context.
2. Assert it contains the existing hosted Ten-Fold white-logo URL and `alt="Ten-Fold"`.
3. Assert it contains none of `Plane`, `plane.so`, `makeplane`, or `planepowers`.
4. Run the focused pytest command and confirm it initially fails because the legacy template contains the excluded references.

## Task 2: Apply the minimal template correction

1. Replace the header logo URL and add Ten-Fold alt text.
2. Delete the footer social-icons block and Plane-hosted decorative icons; retain preference and unsubscribe links.
3. Re-run the focused test and scan the template for excluded branding.
