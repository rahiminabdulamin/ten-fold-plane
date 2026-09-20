import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../core/components/issues/workspace-draft/empty-state.tsx", import.meta.url);

test("the empty Drafts state uses the enlarged subdued Tenfold clipart", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /import tenfoldClipart from "@\/app\/assets\/clipart\/tenfold-clipart-006\.png\?url";/);
  assert.match(
    source,
    /asset=\{<img src=\{tenfoldClipart\} alt="" className="w-80 max-w-none shrink-0 opacity-30" \/>\}/
  );
  assert.doesNotMatch(source, /assetKey="draft"/);
});
