import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile menu renders above the expanded assistant", async () => {
  const source = await readFile(
    new URL("../core/components/workspace/sidebar/user-menu-root.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /portalElement=\{typeof document === "undefined" \? null : document\.body\}/);
  assert.match(source, /menuItemsClassName="z-\[1202\]"/);
});
