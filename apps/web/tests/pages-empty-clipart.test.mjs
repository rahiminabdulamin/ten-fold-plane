import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../core/components/pages/pages-list-main-content.tsx", import.meta.url);

test("the standard empty Pages states use the enlarged subdued Tenfold clipart", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /import tenfoldClipart from "@\/app\/assets\/clipart\/tenfold-clipart-005\.png\?url";/);
  assert.match(
    source,
    /const emptyPagesAsset = <img src=\{tenfoldClipart\} alt="" className="w-80 max-w-none shrink-0 opacity-30" \/>;/
  );
  assert.equal((source.match(/asset=\{emptyPagesAsset\}/g) ?? []).length, 3);
});
