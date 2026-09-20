import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../core/components/account/auth-forms/auth-header.tsx", import.meta.url);

test("the sign-in heading has a subdued Tenfold clipart above it", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /import tenfoldClipart from "@\/app\/assets\/clipart\/tenfold-clipart-007\.png\?url";/);
  assert.match(source, /props\.subHeader === "Welcome back to Ten-Fold\."/);
  assert.match(source, /<img src=\{tenfoldClipart\} alt="" className="mb-8 w-\[20\.4rem\] self-center opacity-30" \/>/);
});
