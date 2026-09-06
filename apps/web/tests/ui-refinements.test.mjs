import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("UI refinements preserve Home, assistant, and page consistency contracts", async () => {
  const [
    home,
    copilot,
    styles,
    select,
    auth,
    workspaceLogo,
    workspaceDropdown,
    profileSidebar,
    profileFilters,
    profileMobile,
    issueProperties,
  ] = await Promise.all([
    read("core/components/home/home-dashboard-widgets.tsx"),
    read("core/components/copilot/root.tsx"),
    read("styles/globals.css"),
    read("../../packages/ui/src/dropdowns/custom-search-select.tsx"),
    read("core/components/auth-screens/auth-base.tsx"),
    read("core/components/workspace/logo.tsx"),
    read("core/components/workspace/sidebar/dropdown-item.tsx"),
    read("core/components/profile/sidebar.tsx"),
    read("core/components/profile/profile-issues-filter.tsx"),
    read("app/(all)/[workspaceSlug]/(projects)/profile/[userId]/mobile-header.tsx"),
    read("core/components/issues/issue-layouts/properties/all-properties.tsx"),
  ]);

  assert.match(home, /HOME_WIDGET_ORDER[^=]*=\s*\["recents", "my_stickies", "quick_links"\]/);
  assert.match(copilot, /COPILOT_PANEL_WIDTH_STORAGE_KEY/);
  assert.match(copilot, /MutationObserver/);
  assert.match(copilot, /onPointerDown={startResize}/);
  assert.match(copilot, /onPointerDown:\s*startLauncherDrag/);
  assert.match(styles, /--copilot-panel-width/);
  assert.match(styles, /\[data-copilotkit\] textarea[\s\S]*width:\s*100%/);
  assert.match(select, /ref={setReferenceElement}/);
  assert.match(select, /strategy:\s*"fixed"/);
  assert.match(auth, /items-center justify-center/);
  assert.doesNotMatch(workspaceLogo, /rounded-md object-cover/);
  assert.doesNotMatch(workspaceDropdown, /rounded-sm object-cover/);
  assert.doesNotMatch(profileSidebar, /CoverImage|Logo logo=/);
  assert.match(profileFilters, /cycleViewDisabled={!FEATURE_VISIBILITY\.CYCLES}/);
  assert.match(profileMobile, /moduleViewDisabled={!FEATURE_VISIBILITY\.MODULES}/);
  assert.match(issueProperties, /FEATURE_VISIBILITY\.MODULES && projectDetails\?\.module_view/);
  assert.match(issueProperties, /FEATURE_VISIBILITY\.CYCLES && projectDetails\?\.cycle_view/);
});
