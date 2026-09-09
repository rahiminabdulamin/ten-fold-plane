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
    powerKCreation,
    powerKNavigation,
    powerKHelp,
    sidebar,
    topNavigation,
    topNavPowerK,
    sidebarWrapper,
    dateDropdown,
    memberOptions,
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
    read("core/components/power-k/config/creation/root.ts"),
    read("core/components/power-k/config/navigation/root.ts"),
    read("core/components/power-k/config/help-commands.ts"),
    read("core/components/sidebar/resizable-sidebar.tsx"),
    read("core/components/navigation/top-navigation-root.tsx"),
    read("core/components/navigation/top-nav-power-k.tsx"),
    read("core/components/sidebar/sidebar-wrapper.tsx"),
    read("core/components/dropdowns/date.tsx"),
    read("core/components/dropdowns/member/member-options.tsx"),
  ]);

  assert.match(home, /HOME_WIDGET_ORDER[^=]*=\s*\["recents", "my_stickies", "quick_links"\]/);
  assert.match(copilot, /COPILOT_PANEL_WIDTH_STORAGE_KEY/);
  assert.doesNotMatch(copilot, /const dateSchema = z\.string\(\)\.date\(\)/);
  assert.match(copilot, /startDate: z\.string\(\)\.date\(\)\.optional\(\)/);
  assert.match(copilot, /targetDate: z\.string\(\)\.date\(\)\.optional\(\)/);
  assert.doesNotMatch(copilot, /MutationObserver/);
  assert.doesNotMatch(copilot, /preserveSidebarOpen/);
  assert.doesNotMatch(copilot, /chat-toggle-button"\]'\)\?\.click\(\)/);
  assert.match(copilot, /const sidebarToggleButton = useMemo/);
  assert.match(copilot, /onPointerDown={startResize}/);
  assert.match(copilot, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(copilot, /event\.stopPropagation\(\)/);
  assert.match(copilot, /const panelWidthRef = useRef\(DEFAULT_COPILOT_PANEL_WIDTH\)/);
  assert.match(copilot, /width="var\(--copilot-panel-width\)"/);
  assert.match(copilot, /panelWidthRef\.current = width/);
  assert.match(copilot, /const stopResize = \(releaseEvent: PointerEvent\)/);
  assert.match(copilot, /releaseEvent\.stopPropagation\(\)/);
  assert.match(copilot, /window\.addEventListener\("pointerup", stopResize, true\)/);
  assert.match(copilot, /<header[\s\S]*className="flex h-\[51px\] items-center justify-between/);
  assert.match(copilot, /onPointerDown:\s*startLauncherDrag/);
  assert.match(styles, /--copilot-panel-width/);
  assert.match(styles, /--copilot-launcher-left/);
  assert.match(styles, /--copilot-launcher-top/);
  assert.match(styles, /margin-inline-end:\s*0 !important/);
  assert.match(styles, /--sidebar-width:\s*var\(--copilot-panel-width\) !important/);
  assert.match(
    styles,
    /body:has\(\[data-copilot-sidebar\]\[aria-hidden="false"\]\) \[data-slot="chat-toggle-button"\]/
  );
  assert.match(styles, /\[data-sidebar-chat\] > \[data-copilotkit\] > div/);
  assert.match(styles, /\[data-copilot-sidebar\] \.cpk\\:px-4[\s\S]*padding-inline:\s*4px !important/);
  assert.match(styles, /\.cpk\\:px-8\.cpk\\:pb-4/);
  assert.match(styles, /padding-inline:\s*0\.5rem !important/);
  assert.match(styles, /\.cpk\\:max-w-3xl\.cpk\\:mx-auto/);
  assert.match(styles, /margin-inline:\s*0 !important/);
  assert.match(styles, /\[data-testid="copilot-chat-input"\][\s\S]*border-radius:\s*0\.5rem !important/);
  assert.match(styles, /\[data-testid\^="copilot-"\]\[data-testid\$="-message"\] > div/);
  assert.match(styles, /\[data-copilotkit\] textarea[\s\S]*width:\s*100%/);
  assert.match(
    styles,
    /\[data-copilotkit\] \[data-testid\^="copilot-"\]\[data-testid\$="-message"\][\s\S]*font-size:\s*13px/
  );
  assert.match(
    styles,
    /\[data-copilot-sidebar\] \.copilot-user-message,\s*\[data-copilot-sidebar\] \.copilot-user-message \*[\s\S]*font-size:\s*13px !important/
  );
  assert.match(
    styles,
    /\[data-copilot-sidebar\] \.copilotKitMessage\.copilotKitUserMessage[\s\S]*padding-block:\s*4px !important/
  );
  assert.match(styles, /min-height:\s*40px !important/);
  assert.match(styles, /max-height:\s*160px !important/);
  assert.match(styles, /resize:\s*none !important/);
  assert.match(select, /ref={setReferenceElement}/);
  assert.match(select, /strategy:\s*"fixed"/);
  assert.match(dateDropdown, /strategy:\s*"fixed"/);
  assert.match(memberOptions, /strategy:\s*"fixed"/);
  assert.match(auth, /items-center justify-center/);
  assert.doesNotMatch(workspaceLogo, /rounded-md object-cover/);
  assert.doesNotMatch(workspaceDropdown, /rounded-sm object-cover/);
  assert.doesNotMatch(profileSidebar, /CoverImage|Logo logo=/);
  assert.match(profileSidebar, /relative px-5 pt-5/);
  assert.match(profileFilters, /cycleViewDisabled={!FEATURE_VISIBILITY\.CYCLES}/);
  assert.match(profileMobile, /moduleViewDisabled={!FEATURE_VISIBILITY\.MODULES}/);
  assert.match(issueProperties, /FEATURE_VISIBILITY\.MODULES && projectDetails\?\.module_view/);
  assert.match(issueProperties, /FEATURE_VISIBILITY\.CYCLES && projectDetails\?\.cycle_view/);
  assert.doesNotMatch(powerKCreation, /create_(?:cycle|module)/);
  assert.doesNotMatch(powerKNavigation, /(?:open|nav)_project_(?:cycle|module)/);
  assert.doesNotMatch(powerKHelp, /open_plane_documentation|join_forum|report_bug/);
  assert.match(sidebar, /isMobile && "fixed top-10 bottom-0 left-0 z-\[40\]"/);
  assert.match(topNavigation, /tenfold-logo-square-rebrand-blackblack-v3\.png/);
  assert.match(topNavigation, /sm:hidden/);
  assert.match(topNavigation, /min-w-0 flex-1/);
  assert.match(topNavigation, /flex shrink-0 items-center sm:flex-1/);
  assert.match(topNavigation, /min-w-0 flex-1 sm:flex-none/);
  assert.match(topNavPowerK, /w-full items-center[^"]*sm:w-\[364px\]/);
  assert.match(sidebarWrapper, /text-\[12px\] whitespace-nowrap text-tertiary/);
});
