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

test("shared drag handles do not render nested buttons inside draggable sidebar triggers", async () => {
  const dragHandle = await readPackage("ui/src/drag-handle.tsx");

  assert.doesNotMatch(dragHandle, /<button/);
  assert.match(dragHandle, /<div[\s\S]*<MoreVerticalOutline/);
});

test("CustomMenu triggers do not wrap IconButton controls", async () => {
  const customMenuConsumers = [
    "app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/spreadsheets/resource-list.tsx",
    "core/components/comments/quick-actions.tsx",
    "core/components/cycles/quick-actions.tsx",
    "core/components/issues/issue-layouts/quick-action-dropdowns/issue-detail.tsx",
    "core/components/issues/layout-quick-actions.tsx",
    "core/components/modules/quick-actions.tsx",
    "core/components/views/quick-actions.tsx",
    "core/components/workspace/sidebar/projects-list-item.tsx",
  ];

  const sources = await Promise.all(customMenuConsumers.map(read));

  for (const source of sources) {
    assert.doesNotMatch(source, /customButton=\{\s*<IconButton/);
  }
});

test("recents filter trigger is visual content rather than a nested button", async () => {
  const filters = await read("core/components/home/widgets/recents/filters.tsx");

  assert.doesNotMatch(filters, /customButton=\{\s*<button/);
  assert.match(filters, /customButton=\{\s*<span/);
});

test("mobile layout selector trigger is visual content rather than a nested button", async () => {
  const selector = await read("core/components/issues/issue-layouts/filters/header/mobile-layout-selection.tsx");

  assert.doesNotMatch(selector, /customButton=\{\s*<Button/);
  assert.match(selector, /customButton=\{\s*<span/);
  assert.match(selector, /\.map\(\(layout\) => \([\s\S]*key=\{layout\.key\}/);
});

test("project cards render settings navigation as a button rather than a nested link", async () => {
  const projectCard = await read("core/components/project/card.tsx");

  assert.doesNotMatch(projectCard, /href=\{`\/\$\{workspaceSlug\}\/settings\/projects\/\$\{project\.id\}`\}/);
  assert.match(projectCard, /router\.push\(`\/\$\{workspaceSlug\}\/settings\/projects\/\$\{project\.id\}`\)/);
});

test("Copilot close controls are marked before focus returns to the launcher", async () => {
  const copilot = await read("core/components/copilot/root.tsx");

  assert.match(copilot, /data-testid="copilot-close-button">\s*\{closeButton\}/);
  assert.match(
    copilot,
    /document\.querySelector<HTMLButtonElement>\('\[data-testid="copilot-chat-toggle"\]'\)\?\.focus\(\)/
  );
});

test("Copilot workspace selector stays above the chat surface and accepts pointer input", async () => {
  const [copilot, select] = await Promise.all([
    read("core/components/copilot/root.tsx"),
    readPackage("ui/src/dropdowns/custom-search-select.tsx"),
  ]);

  assert.match(copilot, /<header[\s\S]*className="pointer-events-auto relative z-\[1202\] bg-surface-1 px-4 py-2"/);
  assert.match(copilot, /className="pointer-events-auto relative z-\[1203\] w-full"/);
  assert.match(copilot, /<CustomSearchSelect[\s\S]*portal=\{false\}/);
  assert.match(select, /strategy:\s*portal \? "fixed" : "absolute"/);
  assert.match(select, /<Combobox\.Options[\s\S]*modal=\{false\}/);
});

test("Copilot workspace selector presents its menu as part of the trigger", async () => {
  const copilot = await read("core/components/copilot/root.tsx");

  assert.match(copilot, /buttonClassName="min-w-0 rounded-md border-subtle bg-surface-1 px-3 py-2 text-13 shadow-sm"/);
  assert.match(
    copilot,
    /optionsClassName="!left-4 w-full min-w-full rounded-md border-subtle bg-surface-1 p-2 shadow-lg"/
  );
});

test("selecting a workspace does not replace the Copilot sidebar header", async () => {
  const copilot = await read("core/components/copilot/root.tsx");

  assert.match(copilot, /const WorkspaceSelectorContext = createContext/);
  assert.match(copilot, /function WorkspaceSelectorHeader/);
  assert.match(copilot, /<WorkspaceSelectorContext\.Provider value=\{workspaceSelectorContextValue\}>/);
  assert.match(copilot, /const sidebarHeader = useMemo\(\(\) => \(\{ children: WorkspaceSelectorHeader \}\), \[\]\);/);
});
