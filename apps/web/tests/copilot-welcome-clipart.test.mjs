import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Copilot welcome state uses responsive Ten-Fold clipart", async () => {
  const source = await readFile(new URL("../core/components/copilot/root.tsx", import.meta.url), "utf8");

  assert.match(source, /import tenfoldClipart from "@\/app\/assets\/clipart\/tenfold-clipart-001\.png\?url";/);
  assert.match(source, /welcomeScreen=\{\(\{ input, suggestionView \}\) => \(/);
  assert.match(source, /<img src=\{tenfoldClipart\} alt="" className="h-auto w-\[70%\] opacity-30" \/>/);
});
