import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project member invite keeps its co-worker picker inside the modal", async () => {
  const modal = await readFile(
    new URL("../core/components/project/send-project-invitation-modal.tsx", import.meta.url),
    "utf8"
  );

  assert.match(modal, /<CustomSearchSelect[\s\S]*?optionsClassName="w-48"[\s\S]*?portal=\{false\}/);
});
