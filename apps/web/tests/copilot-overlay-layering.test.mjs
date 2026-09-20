import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Copilot panel remains behind application dialogs and their backdrops", async () => {
  const styles = await readFile(new URL("../styles/globals.css", import.meta.url), "utf8");

  assert.match(styles, /body:has\(\[role="dialog"\]\) \[data-copilot-sidebar\]/);
  assert.match(styles, /body:has\(\[role="dialog"\]\) \.copilot-panel-resize-handle/);
  assert.match(styles, /z-index:\s*19 !important/);
});
