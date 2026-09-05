import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

async function readAppFile(path) {
  return readFile(new URL(path, appRoot), "utf8");
}

test("publishes original Ten-Fold legal pages", async () => {
  const [routes, terms, privacy] = await Promise.all([
    readAppFile("app/routes/core.ts"),
    readAppFile("app/(home)/terms/page.tsx"),
    readAppFile("app/(home)/privacy/page.tsx"),
  ]);

  assert.match(routes, /route\("terms", "\.\/\(home\)\/terms\/page\.tsx"\)/);
  assert.match(routes, /route\("privacy", "\.\/\(home\)\/privacy\/page\.tsx"\)/);
  assert.match(terms, /TermsOfService/);
  assert.match(privacy, /PrivacyPolicy/);
});

test("uses Ten-Fold legal links in authentication and the workspace sidebar", async () => {
  const [agreement, sidebar] = await Promise.all([
    readAppFile("core/components/account/terms-and-conditions.tsx"),
    readAppFile("app/(all)/[workspaceSlug]/(projects)/sidebar.tsx"),
  ]);

  assert.doesNotMatch(agreement, /plane\.so\/legals/);
  assert.match(agreement, /termsOfService: "\/terms"/);
  assert.match(agreement, /privacyPolicy: "\/privacy"/);
  assert.match(sidebar, /Terms of Service/);
  assert.match(sidebar, /Privacy Policy/);
});

test("keeps long legal content scrollable inside the fixed application shell", async () => {
  const layout = await readAppFile("core/components/legal/legal-page-layout.tsx");

  assert.match(layout, /h-screen[^"]*overflow-y-auto/);
});
