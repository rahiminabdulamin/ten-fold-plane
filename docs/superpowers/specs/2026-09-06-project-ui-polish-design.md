# Project UI Polish Design

## Goal

Remove the remaining project emoji surfaces, hide disabled planning features in Project Settings, fit legal links in the sidebar footer, and restore reliable placement for shared select popovers.

## Scope

- Remove the project logo/emoji display from the project tab header and the Project Settings sidebar header. Project `logo_props` remains stored and is not edited or deleted.
- Filter `features_cycles` and `features_modules` from the Project Settings sidebar when the existing `FEATURE_VISIBILITY` values are false.
- Render the legal footer at 10px with compact gaps and no wrapping so both links stay inside the sidebar width.
- Use Headless UI's native `Combobox.Button` as the Popper reference element in `CustomSelect` and `CustomSearchSelect`. This preserves the reference ref instead of relying on a fragment child and fixes menus appearing at the viewport origin.

## Non-goals

- Do not remove Cycles or Modules implementation, routes, data, or API contracts.
- Do not remove stored project emoji metadata.
- Do not redesign unrelated menus or add a positioning library.

## Verification

- Extend the existing Ten-Fold regression test to assert hidden project logo renderers, settings feature filtering, compact legal footer styles, and direct Combobox trigger refs.
- Run the rebrand test file, focused formatting, TypeScript checks, and whitespace diff validation.
