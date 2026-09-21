import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Ten-Fold defaults to light mode and hides optional planning features", async () => {
  const [root, reset, flags] = await Promise.all([
    read("app/root.tsx"),
    read("core/store/root.store.ts"),
    read("core/constants/feature-visibility.ts"),
  ]);

  assert.match(root, /defaultTheme="light"/);
  assert.doesNotMatch(root, /typeof window === "undefined" \|\| resolvedTheme === undefined/);
  assert.match(reset, /localStorage\.setItem\("theme", "light"\)/);
  assert.match(flags, /CYCLES: false/);
  assert.match(flags, /MODULES: false/);
});

test("users have a fixed Light theme with no theme preference control", async () => {
  const [root, preferences] = await Promise.all([
    read("app/root.tsx"),
    read("core/components/settings/profile/content/pages/preferences/default-list.tsx"),
  ]);

  assert.match(root, /<ThemeProvider themes=\{\["light"\]\} defaultTheme="light" forcedTheme="light">/);
  assert.doesNotMatch(preferences, /ThemeSwitcher/);
});

test("new instructional projects are named Tutorial", async () => {
  const seedTask = await readFile(new URL("../../api/plane/bgtasks/workspace_seed_task.py", import.meta.url), "utf8");
  assert.match(seedTask, /name="Tutorial"/);
});

test("new workspaces use Singapore time and omit restricted settings links", async () => {
  const [workspace, sidebar] = await Promise.all([
    readFile(new URL("../../api/plane/db/models/workspace.py", import.meta.url), "utf8"),
    read("core/components/settings/workspace/sidebar/item-categories.tsx"),
  ]);

  assert.match(workspace, /timezone = models\.CharField\(max_length=255, default="Asia\/Singapore"/);
  assert.match(sidebar, /"billing-and-plans", "webhooks"/);
});

test("Ten-Fold brand marks use the rebranded assets and label loading states", async () => {
  const [spinner, authBase, header, topNavigation, createWorkspace, root] = await Promise.all([
    read("core/components/common/logo-spinner.tsx"),
    read("core/components/auth-screens/auth-base.tsx"),
    read("core/components/auth-screens/header.tsx"),
    read("core/components/navigation/top-navigation-root.tsx"),
    read("app/(all)/create-workspace/page.tsx"),
    read("app/root.tsx"),
  ]);

  assert.match(spinner, /tenfold-clipart-002\.png\?url/);
  assert.match(authBase, /tenfold-rebrand-logo-white\.png\?url/);
  assert.match(header, /src="\/branding\/tenfold-logo-long-rebrand-v4\.png"/);
  assert.match(topNavigation, /tanfold-rebrand-mobile\.png\?url/);
  assert.match(topNavigation, /tenfold-rebrand-logo\.png\?url/);
  assert.match(topNavigation, /<Link href="\/"[^>]*>[\s\S]*src=\{desktopLogo\}/);
  assert.match(createWorkspace, /src="\/branding\/tenfold-logo-long-rebrand-v4\.png"/);
  assert.match(root, /tanfold-rebrand-favicon\.png\?url/);
  assert.match(root, /rel: "icon", type: "image\/png", href: favicon/);
  assert.match(spinner, /animate-shimmer/);
  assert.match(spinner, /Getting you there, hang on\.\.\./);
  assert.match(spinner, /text-\[#BFBFBF\]/);
  assert.match(spinner, /font-bold/);
  assert.match(spinner, /opacity-30/);
  assert.match(spinner, /w-56[\s\S]*sm:w-72/);
});

test("the Copilot launcher uses the animated Ten-Fold eye mark", async () => {
  const copilot = await read("core/components/copilot/root.tsx");

  assert.match(copilot, /tenfold-rebrand-logo-moving-eye\.gif\?url/);
  assert.match(copilot, /openIcon:\s*\(props(?::[^)]*)?\)\s*=>\s*\(\s*<svg[^>]*>\s*<image href=\{tenfoldMovingEye\}/);
  assert.match(copilot, /className: "cpk:rounded-2xl"/);
  assert.match(copilot, /className="h-full w-full rounded-2xl"/);
});

test("invitations and onboarding use the Ten-Fold wordmark", async () => {
  const [invitations, onboardingHeader] = await Promise.all([
    read("app/(all)/invitations/page.tsx"),
    read("core/components/onboarding/header.tsx"),
  ]);

  assert.match(invitations, /tenfold-logo-long-rebrand-v4\.png/);
  assert.match(onboardingHeader, /tenfold-logo-long-rebrand-v4\.png/);
  assert.match(invitations, /width=\{221\}/);
  assert.match(invitations, /height=\{36\}/);
  assert.match(invitations, /<SwitchAccountDropdown/);
  assert.doesNotMatch(invitations, /\{currentUser\?\.email\}/);
  assert.doesNotMatch(invitations, /PlaneLogo/);
  assert.doesNotMatch(onboardingHeader, /PlaneLockup/);
});

test("Ten-Fold removes unavailable onboarding and profile surfaces", async () => {
  const [home, profileSidebar, profileForm, userMenu, sidebarWrapper] = await Promise.all([
    read("core/components/home/home-dashboard-widgets.tsx"),
    read("core/components/settings/profile/sidebar/item-categories.tsx"),
    read("core/components/settings/profile/content/pages/general/form.tsx"),
    read("core/components/workspace/sidebar/user-menu-root.tsx"),
    read("core/components/sidebar/sidebar-wrapper.tsx"),
  ]);

  assert.doesNotMatch(home, /<NoProjectsEmptyState \/>/);
  assert.match(profileSidebar, /category === "developer"/);
  assert.match(profileForm, /className="hidden"/);
  assert.match(userMenu, /className="hidden"/);
  assert.match(sidebarWrapper, /href="\/terms"/);
  assert.match(sidebarWrapper, /href="\/privacy"/);
});

test("Ten-Fold loader shimmers the subdued clipart instead of spinning", async () => {
  const spinner = await read("core/components/common/logo-spinner.tsx");
  assert.match(spinner, /tenfold-clipart-002\.png\?url/);
  assert.match(spinner, /animate-shimmer/);
  assert.match(spinner, /className="animate-shimmer flex flex-col items-center justify-center gap-8"/);
  assert.match(spinner, /className="text-base font-bold text-\[#BFBFBF\]"/);
  assert.equal((spinner.match(/animate-shimmer/g) ?? []).length, 1);
  assert.doesNotMatch(spinner, /animate-spin/);
});

test("authentication surfaces use Ten-Fold branding without a compact-layout promotion", async () => {
  const [authBase, authFormHeader] = await Promise.all([
    read("core/components/auth-screens/auth-base.tsx"),
    read("core/components/account/auth-forms/auth-header.tsx"),
  ]);

  assert.match(authBase, /lg:grid-cols-2/);
  assert.match(authBase, /tenfold-rebrand-logo-white\.png\?url/);
  assert.match(authBase, /#00364c/);
  assert.match(authBase, /h-16/);
  assert.match(authBase, /dimensions[\s\S]*screenshot-landing\.png[\s\S]*A focused place for teams/);
  assert.doesNotMatch(authBase, /screenshot-landing\.png[\s\S]*shadow-\[/);
  assert.match(authFormHeader, /Welcome back to Ten-Fold\./);
  assert.match(authFormHeader, /Create your Ten-Fold account\./);
  assert.doesNotMatch(authFormHeader, /Work in all dimensions\./);
  assert.doesNotMatch(authFormHeader, /(?:Welcome back to|Create your) Plane/);
  assert.doesNotMatch(authBase, /AuthFooter/);
  assert.doesNotMatch(authBase, /Join 10,000\+ teams building with Ten-Fold/);
});

test("CopilotKit is a compact resizable Ten-Fold panel below the viewport-wide navigation", async () => {
  const [copilot, contentWrapper, styles] = await Promise.all([
    read("core/components/copilot/root.tsx"),
    read("core/components/workspace/content-wrapper.tsx"),
    read("styles/globals.css"),
  ]);

  assert.match(copilot, /position="right"/);
  assert.match(copilot, /width="var\(--copilot-panel-width\)"/);
  assert.match(copilot, /Ten-Fold Assistant/);
  assert.match(
    copilot,
    /<span className="rounded-sm bg-accent-primary\/20 px-1\.5 py-0\.5 text-10 font-medium text-accent-primary">beta<\/span>/
  );
  assert.match(copilot, /const sidebarHeader = useMemo/);
  assert.match(copilot, /header=\{sidebarHeader\}/);
  assert.match(copilot, /<CopilotKit[\s\S]*showDevConsole=\{false\}/);
  assert.match(copilot, /<svg/);
  assert.match(contentWrapper, /copilot-panel-layout/);
  assert.match(styles, /\.copilot-panel-layout/);
  assert.match(styles, /--copilot-panel-width/);
  assert.match(styles, /inline-size:\s*calc\(100% - var\(--copilot-panel-width\)\)/);
  assert.doesNotMatch(styles, /flex:\s*0 0 calc\(100% - var\(--copilot-panel-width\)\)/);
  assert.match(styles, /\[data-copilotkit\]/);
  assert.match(styles, /z-index: 99999/);
});

test("sidebar legal links replace Community and project presentation omits editable emoji", async () => {
  const [sidebar, sidebarWrapper, projectListItem, projectCard, projectForm, projectCreateHeader] = await Promise.all([
    read("app/(all)/[workspaceSlug]/(projects)/sidebar.tsx"),
    read("core/components/sidebar/sidebar-wrapper.tsx"),
    read("core/components/workspace/sidebar/projects-list-item.tsx"),
    read("core/components/project/card.tsx"),
    read("core/components/project/form.tsx"),
    read("core/components/project/create/header.tsx"),
  ]);

  assert.match(sidebarWrapper, /Terms of Service/);
  assert.match(sidebarWrapper, /whitespace-nowrap/);
  assert.doesNotMatch(sidebarWrapper, /WorkspaceEditionBadge/);
  assert.doesNotMatch(sidebar, /Terms of Service/);
  assert.doesNotMatch(projectListItem, /<Logo logo=\{project\.logo_props\}/);
  assert.doesNotMatch(projectCard, /<Logo logo=\{project\.logo_props\}/);
  assert.match(projectCard, /text-primary/);
  assert.doesNotMatch(projectForm, /<EmojiPicker/);
  assert.doesNotMatch(projectCreateHeader, /<EmojiPicker/);
});

test("project UI polish hides disabled chrome and keeps select popovers anchored", async () => {
  const [
    projectHeader,
    projectSwitcher,
    settingsHeader,
    settingsItems,
    sidebarWrapper,
    customSelect,
    customSearchSelect,
  ] = await Promise.all([
    read("core/components/navigation/project-header-button.tsx"),
    read("core/components/navigation/project-header.tsx"),
    read("core/components/settings/project/sidebar/header.tsx"),
    read("core/components/settings/project/sidebar/item-categories.tsx"),
    read("core/components/sidebar/sidebar-wrapper.tsx"),
    read("../../packages/ui/src/dropdowns/custom-select.tsx"),
    read("../../packages/ui/src/dropdowns/custom-search-select.tsx"),
  ]);
  const [timezoneSelect, memberSelect, exportForm] = await Promise.all([
    read("core/components/global/timezone-select.tsx"),
    read("core/components/project/member-select.tsx"),
    read("core/components/exporter/export-form.tsx"),
  ]);

  assert.doesNotMatch(projectHeader, /<Logo /);
  assert.match(projectSwitcher, /<CustomSearchSelect/);
  assert.doesNotMatch(settingsHeader, /<Logo /);
  assert.match(settingsItems, /FEATURE_VISIBILITY\.CYCLES/);
  assert.match(settingsItems, /FEATURE_VISIBILITY\.MODULES/);
  assert.match(sidebarWrapper, /text-\[12px\]/);
  assert.match(sidebarWrapper, /gap-1\.5/);
  assert.match(customSelect, /<Combobox\.Button[\s\S]*ref=\{setReferenceElement\}/);
  assert.match(customSearchSelect, /<Combobox\.Button[\s\S]*ref=\{setReferenceElement\}/);
  assert.match(customSelect, /strategy:\s*"fixed"/);
  assert.match(customSelect, /\{\(\{ open \}\) =>/);
  assert.match(customSearchSelect, /\{\(\{ open \}[^)]*\) =>/);
  assert.match(customSelect, /<Combobox\.Options[\s\S]*ref=\{setPopperElement\}/);
  assert.match(customSearchSelect, /<Combobox\.Options[\s\S]*ref=\{setPopperElement\}/);
  assert.match(customSearchSelect, /<Combobox\.Input[\s\S]*onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(
    customSearchSelect,
    /vertical-scrollbar[^>]*onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}[\s\S]*onWheel=\{\(event\) => event\.stopPropagation\(\)\}/
  );
  assert.doesNotMatch(customSelect, /useOutsideClickDetector|const \[isOpen/);
  assert.doesNotMatch(customSearchSelect, /useOutsideClickDetector|const \[isOpen/);
  assert.match(customSearchSelect, /portal = true/);
  assert.match(customSearchSelect, /import \{ Combobox, Portal \} from "@headlessui\/react"/);
  assert.match(customSearchSelect, /<Portal>/);
  assert.doesNotMatch(customSearchSelect, /createPortal/);
  assert.match(timezoneSelect, /<Combobox\.Options[\s\S]*showSearch/);
  assert.match(memberSelect, /<Combobox\.Options showSearch/);
  assert.match(exportForm, /<Combobox\.Options[\s\S]*showSearch/);
  assert.doesNotMatch(exportForm, /CustomSearchSelect/);
  assert.doesNotMatch(customSelect, /Combobox\.Button as=\{React\.Fragment\}/);
  assert.doesNotMatch(customSearchSelect, /Combobox\.Button as=\{React\.Fragment\}/);
});
