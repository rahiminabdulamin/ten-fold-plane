import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile work-items context controls stay on one compact row", async () => {
  const source = await readFile(new URL("../core/components/issues/header.tsx", import.meta.url), "utf8");

  assert.match(source, /<Header\.LeftItem className="min-w-0 flex-1 flex-nowrap overflow-hidden">/);
  assert.match(source, /className="flex min-w-0 flex-nowrap items-center gap-2\.5 overflow-hidden"/);
  assert.match(source, /className="min-w-0 flex-1 overflow-hidden"/);
  assert.equal((source.match(/className="shrink-0"/g) ?? []).length, 2);
  assert.match(source, /className="group flex shrink-0 items-center/);
});
