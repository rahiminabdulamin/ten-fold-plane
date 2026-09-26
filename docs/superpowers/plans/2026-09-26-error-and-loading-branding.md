# Error and loading branding implementation plan

## Files

- `apps/web/app/error/prod.tsx`: error illustration and support action.
- `apps/web/core/components/common/logo-spinner.tsx`: loading illustration import.
- `apps/web/app/error/prod.test.tsx`: rebrand regression checks.

## Task 1: Establish branding contracts

1. Add a focused test that reads both component sources.
2. Assert the error page uses `tenfold-clipart-008.png` and `mailto:contact@kognitif.ai`.
3. Assert it contains no Plane support/status/social destinations.
4. Assert the spinner imports `tenfold-clipart-002a.png`.
5. Run the focused test and confirm it fails against the current sources.

## Task 2: Update the two presentation components

1. Replace the error-page illustration imports with the supplied clipart.
2. Reduce the error-page support action to the requested contact address.
3. Replace the spinner import with `tenfold-clipart-002a.png`.
4. Re-run the focused test and web type check.
