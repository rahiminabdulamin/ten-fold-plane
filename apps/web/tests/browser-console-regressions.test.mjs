import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readPackage = (path) => readFile(new URL(`../../../packages/${path}`, import.meta.url), "utf8");

test("browser utilities do not import Node-only HTML sanitization", async () => {
  const stringUtilities = await readPackage("utils/src/string.ts");

  assert.doesNotMatch(stringUtilities, /from "sanitize-html"/);
});

test("spreadsheet icons consume iconKey without forwarding it to SVG", async () => {
  const utilities = await read("core/components/issues/issue-layouts/utils.tsx");

  assert.match(utilities, /const \{ iconKey, \.\.\.svgProps \} = props/);
  assert.match(utilities, /<Icon \{\.\.\.svgProps\} \/>/);
});

test("projects without intake do not request a triage state", async () => {
  const wrapper = await read("core/layouts/auth-layout/project-wrapper.tsx");

  assert.match(wrapper, /const currentProjectDetails = getProjectById\(projectId\)/);
  assert.match(wrapper, /currentProjectDetails\?\.inbox_view \? PROJECT_INTAKE_STATE/);
});

test("closing the Copilot sidebar restores focus to its launcher", async () => {
  const copilot = await read("core/components/copilot/root.tsx");

  assert.match(
    copilot,
    /document\.querySelector<HTMLButtonElement>\('\[data-testid="copilot-chat-toggle"\]'\)\?\.focus\(\)/
  );
});
