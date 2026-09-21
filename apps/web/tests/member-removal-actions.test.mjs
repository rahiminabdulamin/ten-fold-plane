import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("member removal actions remain visible in workspace and project member rows", async () => {
  const [workspaceColumns, projectColumns] = await Promise.all([
    read("core/components/workspace/settings/member-columns.tsx"),
    read("core/components/project/settings/member-columns.tsx"),
  ]);

  assert.doesNotMatch(workspaceColumns, /opacity-0 group-hover:opacity-100/);
  assert.doesNotMatch(projectColumns, /opacity-0 group-hover:opacity-100/);
});
