import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("workspace rows use a tree connector in the main sidebar", async () => {
  const [projectsList, projectRow] = await Promise.all([
    read("core/components/workspace/sidebar/projects-list.tsx"),
    read("core/components/workspace/sidebar/projects-list-item.tsx"),
  ]);

  assert.match(projectsList, /workspace-tree-connector/);
  assert.match(projectRow, /workspace-tree-branch/);
  assert.match(projectRow, /isLastChild && "bottom-1\/2"/);
});
