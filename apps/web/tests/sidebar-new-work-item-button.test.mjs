import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sidebar New work item button fills the panel with the requested blue treatment", async () => {
  const quickActions = await readFile(
    new URL("../core/components/workspace/sidebar/quick-actions.tsx", import.meta.url),
    "utf8"
  );

  assert.match(quickActions, /className="w-full border-0 bg-\[#006196\] text-white"/);
});
