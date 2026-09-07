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

test("the public Space entry points do not render Plane branding", async () => {
  const [root, authHeader, userLoggedIn, authView, manifest] = await Promise.all([
    readFile(new URL("app/root.tsx", spaceRoot), "utf8"),
    readFile(new URL("components/views/header.tsx", spaceRoot), "utf8"),
    readFile(new URL("components/account/user-logged-in.tsx", spaceRoot), "utf8"),
    readFile(new URL("components/views/auth.tsx", spaceRoot), "utf8"),
    readFile(new URL("public/site.webmanifest.json", spaceRoot), "utf8"),
  ]);

  for (const entryPoint of [root, authHeader, userLoggedIn, authView]) {
    assert.doesNotMatch(entryPoint, /PlaneLockup|PoweredBy|plane\.so|@planepowers/);
  }
  assert.doesNotMatch(manifest, /Plane/i);
  assert.match(root, /Ten-Fold/);
  assert.match(manifest, /Ten-Fold/);
});
