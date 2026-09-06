# CopilotKit UI Polish Design

## Objective

Make the global assistant read as a native third application panel, without reducing the viewport-wide top navigation, and remove remaining CopilotKit and mobile-auth visual chrome.

## Scope

- The assistant sidebar opens from the left below the application top bar on desktop.
- The top navigation remains full viewport width while the sidebar changes the lower application body's available width.
- The sidebar header reads **Ten-Fold Assistant**, is left aligned, includes a small inline assistant SVG, and uses the application primary text color.
- Assistant typography uses the web application's compact body scale; the CopilotKit license badge is not displayed.
- The mobile/tablet authentication layout omits the promotional footer.

## Design

`WorkspaceContentWrapper` remains the owner of the application chrome. It will apply a lower-body-only margin when CopilotKit's desktop sidebar is open; CopilotKit's built-in body margin is neutralized. This makes the assistant, app rail, and content share a single row beneath `TopNavigationRoot`, while the navigation never shifts or narrows.

`PlaneCopilot` will use CopilotKit's supported sidebar header and label slots. A small inline SVG remains local to the component, so no icon dependency or asset is added. Global styles, scoped to `[data-copilotkit]`, set the sidebar offset, app typography, primary color variables, and hide the license badge selector. The existing CopilotKit package is not modified.

The mobile auth footer render is removed from `AuthBase`; the unused footer component is deleted as it has no other consumer.

## Acceptance Criteria

- Opening the desktop assistant does not move or constrain the top navigation.
- The assistant opens on the left and the lower app body shifts as one connected layout.
- "CopilotKit Chat" and the visible powered-by badge are absent; "Ten-Fold Assistant" is present in a left-aligned icon header.
- Chat body/input text is 13px scale and chat headings do not exceed the normal 16px application heading scale.
- The compact auth layout contains no promotional team-count footer.
- `node --test apps/web/tests/ten-fold-rebrand.test.mjs`, web type checks, lint, and formatting checks pass.
