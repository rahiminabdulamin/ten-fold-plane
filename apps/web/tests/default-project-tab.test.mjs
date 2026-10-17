import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(new URL("../package.json", import.meta.url));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const result = await build({
  stdin: {
    contents: `export {useTabPreferences} from './core/components/navigation/use-tab-preferences';
      export {getTabUrl} from './core/components/navigation/tab-navigation-utils';`,
    resolveDir: new URL("..", import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  format: "esm",
  plugins: [
    {
      name: "hook-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /^(react$|react-router$|swr$|@)/ }, ({ path }) => ({ path, namespace: "mock" }));
        builder.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
          contents:
            {
              react: "export const useMemo = fn => fn();",
              "react-router": "export const useNavigate = () => globalThis.fixture.navigate;",
              swr: "export default (...args) => { globalThis.fixture.swr = args; return {}; };",
              "@plane/constants": 'export const PROJECT_MEMBER_PREFERENCES = (...args) => args.join(":");',
              "@plane/propel/toast":
                'export const TOAST_TYPE = {SUCCESS: "success", ERROR: "error"}; export const setToast = toast => globalThis.fixture.toasts.push(toast);',
              "@/hooks/store/use-member": "export const useMember = () => ({project: globalThis.fixture.member});",
              "@/hooks/store/user":
                'export const useUser = () => ({data: {id: "user"}}); export const useUserPermissions = () => ({getProjectRoleByWorkspaceSlugAndProjectId: () => 20});',
            }[path] ??
            (() => {
              throw new Error(`Unexpected import ${path}`);
            })(),
        }));
      },
    },
  ],
});
const { useTabPreferences, getTabUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);

function setup(defaultTab = "work_items", fail = false) {
  const saved = {
    preferences: {
      pages: { block_display: true },
      navigation: { default_tab: defaultTab, hide_in_more_menu: ["cycles"] },
    },
  };
  globalThis.fixture = {
    toasts: [],
    navigations: [],
    navigate: (...args) => fixture.navigations.push(args),
    member: {
      getProjectUserProperties: () => saved,
      fetchProjectUserProperties: async () => saved,
      updateProjectUserProperties: async (_workspace, _project, data) => {
        if (fail) throw new Error("Save failed");
        Object.assign(saved, data);
      },
    },
  };
  return saved;
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("setting a default saves it and opens its URL so refresh retains the tab", async () => {
  const saved = setup();
  useTabPreferences("workspace", "project").handleToggleDefaultTab("views");
  await settle();
  assert.equal(saved.preferences.navigation.default_tab, "views");
  assert.deepEqual(saved.preferences.navigation.hide_in_more_menu, ["cycles"]);
  assert.equal(saved.preferences.pages.block_display, true);
  assert.deepEqual(fixture.navigations, [["/workspace/projects/project/views"]]);
  assert.equal(useTabPreferences("workspace", "project").tabPreferences.defaultTab, "views");
});

test("failed saves leave the current URL alone", async () => {
  setup("work_items", true);
  useTabPreferences("workspace", "project").handleToggleDefaultTab("pages");
  await settle();
  assert.deepEqual(fixture.navigations, []);
  assert.equal(fixture.toasts[0].type, "error");
});

test("clearing the default preserves the current tab", async () => {
  const saved = setup("pages");
  useTabPreferences("workspace", "project").handleToggleDefaultTab("pages");
  await settle();
  assert.equal(saved.preferences.navigation.default_tab, "work_items");
  assert.deepEqual(fixture.navigations, []);
});

test("Sheets and Forms have default navigation URLs", () => {
  for (const tab of ["spreadsheets", "forms"]) {
    assert.equal(getTabUrl("workspace", "project", tab), `/workspace/projects/project/${tab}`);
  }
});

test("preferences are fetched before project navigation chooses a default", () => {
  setup();
  fixture.member.getProjectUserProperties = () => null;
  assert.equal(useTabPreferences("workspace", "project").isLoading, true);
  assert.ok(fixture.swr, "the hook must load saved preferences even outside the project layout");
  assert.equal(fixture.swr[0], "project:20");
});
