import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const componentPath = new URL(
  "../core/components/issues/issue-layouts/empty-states/project-issues.tsx",
  import.meta.url
);

test("the empty workspace work-items state uses the subdued Tenfold clipart", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /import tenfoldClipart from "@\/app\/assets\/clipart\/tenfold-clipart-003a\.png\?url";/);
  assert.match(
    source,
    /asset=\{<img src=\{tenfoldClipart\} alt="" className="w-\[22\.125rem\] max-w-none shrink-0 opacity-30" \/>\}/
  );
  assert.doesNotMatch(source, /assetKey="work-item"/);
});
