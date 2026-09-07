import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const spaceRoot = new URL("../", import.meta.url);

test("published issue metadata uses a Space-owned Ten-Fold logo asset", async () => {
  const layout = await readFile(new URL("app/issues/[anchor]/layout.tsx", spaceRoot), "utf8");

  assert.doesNotMatch(layout, /web\/public/);
  assert.match(layout, /const TENFOLD_LOGO_URL = "\/branding\/tenfold-logo-square-rebrand-black-v3\.png"/);
  await access(new URL("public/branding/tenfold-logo-square-rebrand-black-v3.png", spaceRoot));
});
