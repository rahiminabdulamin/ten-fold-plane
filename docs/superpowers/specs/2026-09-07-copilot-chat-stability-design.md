# Copilot Chat Stability Design

## Goal

Make the Ten-Fold assistant panel remain visible after recoverable fetch failures, keep the composer height stable while typing, and make the compact chat consistently use 14px text with denser spacing.

## Scope

`apps/web/core/components/copilot/root.tsx` owns the assistant lifecycle. Because the installed CopilotKit sidebar is uncontrolled, it retains whether the user opened the sidebar, distinguishes its stable close button from an unexpected hide, and reopens only after the latter. The identity-token refresh preserves the last valid token and retries after a failed request instead of allowing an unhandled rejected fetch to break the refresh flow.

`apps/web/styles/globals.css` will explicitly normalize the CopilotKit message tree, controls, and Markdown descendants to 14px. It will reduce message/bubble/content padding and message gaps. The composer will have stable box sizing, a one-line baseline height, bounded maximum height, and disabled native resize so its measured height does not alternate while a user types.

## Behavior

- Opening the assistant marks it as preserved; an unexpected hide reopens it through CopilotKit's launcher.
- Explicitly closing the assistant marks it closed; it is not reopened by an unrelated rerender.
- An identity refresh HTTP error or network rejection keeps the current token and schedules a retry.
- Assistant message text, lists, table cells, controls, and composer text render at 14px; intentionally secondary metadata stays 12px.
- Bubbles have reduced padding and 4px vertical inter-message spacing. The chat shell has reduced horizontal padding.
- The composer keeps a fixed one-line starting size and only grows within a defined maximum; its outer box does not flicker between sizes on normal character input.

## Verification

The web source-contract test covers preserved sidebar intent, retained token/retry behavior, and the CSS hooks that enforce the compact visual contract. Run the focused test file, then the web type check.
