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

test("the Copilot Web Inspector is disabled without hiding the chat toggle", async () => {
  const copilot = await read("core/components/copilot/root.tsx");

  assert.match(copilot, /enableInspector=\{false\}/);
  assert.match(copilot, /data-testid="copilot-chat-toggle"/);
});

test("issue root route synchronization happens inside a MobX action", async () => {
  const store = await read("core/store/issue/root.store.ts");

  assert.match(store, /import \{ autorun, makeObservable, observable, runInAction \} from "mobx"/);
  assert.match(store, /const hasStateMap = !isEmpty\(stateMap\);[\s\S]*runInAction\(\(\) => \{/);
  assert.match(store, /autorun\(\(\) => \{[\s\S]*runInAction\(\(\) => \{/);
});

test("workspace loading resets inside a MobX action after async work", async () => {
  const store = await read("core/store/workspace/index.ts");

  assert.match(store, /finally \{\s*runInAction\(\(\) => \{\s*this\.loader = false;/);
});

test("user menu custom trigger does not render a nested button", async () => {
  const userMenu = await read("core/components/workspace/sidebar/user-menu-root.tsx");

  assert.doesNotMatch(userMenu, /customButton=\{\s*<AppSidebarItem\s+variant="button"/);
  assert.match(userMenu, /customButton=\{\s*<AppSidebarItem\.Icon/);
});

test("work item filters create MobX filter instances after render", async () => {
  const filters = await read("core/components/work-item-filters/filters-hoc/base.tsx");

  assert.doesNotMatch(filters, /const workItemLayoutFilter = useMemo\(\s*\(\) =>\s*getOrCreateFilter/);
  assert.match(filters, /useEffect\(\(\) => \{\s*getOrCreateFilter\(/);
  assert.match(filters, /useEffect\(\s*\(\) => \(\) => \{\s*deleteFilter\(entityType, workItemEntityID\);/);
  assert.match(filters, /const workItemLayoutFilter = getFilter\(entityType, workItemEntityID\)/);
});

test("project sidebar autoscroll targets the scroll area viewport", async () => {
  const projectsList = await read("core/components/workspace/sidebar/projects-list.tsx");

  assert.match(projectsList, /closest<HTMLElement>\('\[data-slot="scroll-area-viewport"\]'\)/);
});

test("project user-properties failures do not erase the thrown error", async () => {
  const projectService = await read("core/services/project/project.service.ts");

  assert.match(projectService, /getProjectUserProperties[\s\S]*throw error\?\.response\?\.data \?\? error/);
});
