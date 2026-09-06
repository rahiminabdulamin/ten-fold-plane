# Responsive Assistant Layout Design

The assistant is a right-side panel below the top navigation. Desktop uses a CSS custom property for its width (280–560px) and a pointer resize handle; the content row receives a matching right margin and `min-width: 0`. Mobile panels overlay content instead of reducing it. The assistant launcher is smaller, draggable within the viewport, persisted in localStorage, and reset to bottom-right whenever its panel closes or on a fresh load.

The assistant header adds a new-conversation control before close. New conversation resets the Copilot thread through the documented client API. The panel remains mounted so a token refresh or route change cannot close it. The command-search input uses `min(100%, ...)` and mobile navigation uses fixed overlay positioning. The square black rebrand asset replaces favicon links.
