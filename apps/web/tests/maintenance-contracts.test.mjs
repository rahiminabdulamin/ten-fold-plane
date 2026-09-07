import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web code stays compatible with its ES2022 target and current sidebar contracts", async () => {
  const [membersList, sidebarWrapper, copilot] = await Promise.all([
    read("core/components/workspace/settings/members-list.tsx"),
    read("core/components/sidebar/sidebar-wrapper.tsx"),
    read("core/components/copilot/root.tsx"),
  ]);

  assert.doesNotMatch(membersList, /\.toSorted\(/);
  assert.match(membersList, /\.sort\(\(a, b\) =>/);
  assert.match(sidebarWrapper, /Terms of Service/);
  assert.match(sidebarWrapper, /Privacy Policy/);
  assert.match(copilot, /header=\{sidebarHeader\}/);
});
