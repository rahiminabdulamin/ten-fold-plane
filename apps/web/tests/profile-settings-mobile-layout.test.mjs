import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("profile settings keeps its mobile navigation above a full-width content pane", async () => {
  const [modal, sidebar, header, categories, content] = await Promise.all([
    readFile(new URL("../core/components/settings/profile/modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../core/components/settings/profile/sidebar/root.tsx", import.meta.url), "utf8"),
    readFile(new URL("../core/components/settings/profile/sidebar/header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../core/components/settings/profile/sidebar/item-categories.tsx", import.meta.url), "utf8"),
    readFile(new URL("../core/components/settings/profile/content/root.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(modal, /className="flex size-full max-md:flex-col"/);
  assert.match(sidebar, /max-md:w-full[\s\S]*max-md:overflow-x-auto/);
  assert.doesNotMatch(sidebar, /max-md:border-b/);
  assert.match(header, /hidden[\s\S]*md:flex/);
  assert.match(categories, /max-md:flex-row[\s\S]*max-md:overflow-x-auto/);
  assert.match(content, /max-md:w-full max-md:min-h-0/);
});
