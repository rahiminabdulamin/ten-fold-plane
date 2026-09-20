import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sidebar More controls close their active secondary menu", async () => {
  const source = await readFile(
    new URL("../core/components/workspace/sidebar/sidebar-menu-items.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /toggleExtendedSidebarMenu = \(mode: "personal" \| "workspace"\)/);
  assert.match(source, /toggleExtendedSidebar\(false\)/);
  assert.match(source, /onClick=\{\(\) => toggleExtendedSidebarMenu\("personal"\)\}/);
  assert.match(source, /onClick=\{\(\) => toggleExtendedSidebarMenu\("workspace"\)\}/);
  assert.match(source, /isExtendedSidebarOpened && extendedSidebarMode === "personal" \? "Hide" : "More"/);
});
