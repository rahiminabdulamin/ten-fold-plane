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
  assert.match(reset, /localStorage\.setItem\("theme", "light"\)/);
  assert.match(flags, /CYCLES: false/);
  assert.match(flags, /MODULES: false/);
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

test("Ten-Fold brand marks link home, use the long workspace logo, and label loading states", async () => {
  const [spinner, authBase, header, topNavigation, createWorkspace] = await Promise.all([
    read("core/components/common/logo-spinner.tsx"),
    read("core/components/auth-screens/auth-base.tsx"),
    read("core/components/auth-screens/header.tsx"),
    read("core/components/navigation/top-navigation-root.tsx"),
    read("app/(all)/create-workspace/page.tsx"),
  ]);

  assert.match(spinner, /src="\/branding\/tenfold-logo-square-rebrand-loader-v3\.png"/);
  assert.match(authBase, /src="\/branding\/tenfold-logo-long-rebrand-white-v3\.png"/);
  assert.match(header, /src="\/branding\/tenfold-logo-long-rebrand-v3\.png"/);
  assert.match(topNavigation, /src="\/branding\/tenfold-logo-long-rebrand-v3\.png"/);
  assert.match(topNavigation, /<Link href="\/"[^>]*>[\s\S]*tenfold-logo-long-rebrand-v3\.png/);
  assert.match(createWorkspace, /src="\/branding\/tenfold-logo-long-rebrand-v3\.png"/);
  assert.match(spinner, /animate-shimmer/);
  assert.match(spinner, /Please wait\.\.\./);
  assert.match(spinner, /text-\[#BFBFBF\]/);
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

test("Ten-Fold loader shimmers the square logo instead of spinning", async () => {
  const spinner = await read("core/components/common/logo-spinner.tsx");
  assert.match(spinner, /tenfold-logo-square-rebrand-loader-v3\.png/);
  assert.match(spinner, /animate-shimmer/);
  assert.doesNotMatch(spinner, /animate-spin/);
});

test("authentication surfaces use Ten-Fold branding without a compact-layout promotion", async () => {
  const [authBase, authFormHeader] = await Promise.all([
    read("core/components/auth-screens/auth-base.tsx"),
    read("core/components/account/auth-forms/auth-header.tsx"),
  ]);

  assert.match(authBase, /lg:grid-cols-2/);
  assert.match(authBase, /tenfold-logo-long-rebrand-white-v3\.png/);
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
  assert.match(copilot, /header=\{\{/);
  assert.match(copilot, /<svg/);
  assert.match(contentWrapper, /copilot-panel-layout/);
  assert.match(styles, /\.copilot-panel-layout/);
  assert.match(styles, /--copilot-panel-width/);
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
  const [projectHeader, settingsHeader, settingsItems, sidebarWrapper, customSelect, customSearchSelect] =
    await Promise.all([
      read("core/components/navigation/project-header-button.tsx"),
      read("core/components/settings/project/sidebar/header.tsx"),
      read("core/components/settings/project/sidebar/item-categories.tsx"),
      read("core/components/sidebar/sidebar-wrapper.tsx"),
      read("../../packages/ui/src/dropdowns/custom-select.tsx"),
      read("../../packages/ui/src/dropdowns/custom-search-select.tsx"),
    ]);

  assert.doesNotMatch(projectHeader, /<Logo /);
  assert.doesNotMatch(settingsHeader, /<Logo /);
  assert.match(settingsItems, /FEATURE_VISIBILITY\.CYCLES/);
  assert.match(settingsItems, /FEATURE_VISIBILITY\.MODULES/);
  assert.match(sidebarWrapper, /text-\[10px\]/);
  assert.match(sidebarWrapper, /gap-1\.5/);
  assert.match(customSelect, /<Combobox\.Button[\s\S]*ref=\{setReferenceElement\}/);
  assert.match(customSearchSelect, /<Combobox\.Button[\s\S]*ref=\{setReferenceElement\}/);
  assert.doesNotMatch(customSelect, /Combobox\.Button as=\{React\.Fragment\}/);
  assert.doesNotMatch(customSearchSelect, /Combobox\.Button as=\{React\.Fragment\}/);
});
