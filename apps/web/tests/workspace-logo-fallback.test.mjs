import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace avatars without an uploaded logo use the neutral fallback fill", async () => {
  const [dropdownItem, workspaceLogo] = await Promise.all([
    readFile(new URL("../core/components/workspace/sidebar/dropdown-item.tsx", import.meta.url), "utf8"),
    readFile(new URL("../core/components/workspace/logo.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(dropdownItem, /!workspace\?\.logo_url && "rounded-md bg-\[#71777A\] text-on-color"/);
  assert.match(workspaceLogo, /!props\.logo && "rounded-md bg-\[#71777A\] text-on-color"/);
});
